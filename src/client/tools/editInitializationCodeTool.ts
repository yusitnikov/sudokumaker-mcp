import { z } from "zod";
import { CustomElementToolImplementation } from "./CustomElementToolImplementation";
import { editInitializationCodeToolName } from "./toolNames";
import { CustomElement } from "../../elements/CustomElement";
import { customConstraintsTopicName } from "./docs/topicNames";
import { editText, editTextOperation } from "./editText";
import type { BackendResources } from "../../BackendResources";
// Types only - erased by `verbatimModuleSyntax`, so the compiler never reaches the page bundle.
import type * as ts from "typescript";

/** Where the snippet lives in the virtual program - its diagnostics are the only ones reported. */
export const snippetFileName = "/snippet.ts";

/**
 * Declares the element's own components, which the initialization code constructs by bare name.
 *
 * Their constructor parameters can't be recovered - the real signature is only discoverable by
 * analysing user code this doesn't parse, and `unknown[]` would reject every real call site. A name
 * shadowing a standard component is skipped rather than declared twice: a duplicate `class` in one
 * global scope is a redeclaration error, and the standard signature is the better of the two.
 */
const buildCustomComponentDeclarations = (customComponentNames: string[], globalsDts: string) => {
  const declarations = customComponentNames
    .filter((name) => !new RegExp(`^  class ${RegExp.escape(name)} \\{`, "m").test(globalsDts))
    .map((name) => `  class ${name} { constructor(...args: any[]); }\n`)
    .join("");

  return `declare global {\n${declarations}}\nexport {};\n`;
};

/** Renders one diagnostic as `line N: message`, followed by the offending source line. */
const formatDiagnostic = (typescript: BackendResources["typescript"], diagnostic: ts.Diagnostic, code: string) => {
  const message = typescript.flattenDiagnosticMessageText(diagnostic.messageText, " ");
  if (!diagnostic.file || diagnostic.start === undefined) {
    return message;
  }

  const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

  return `line ${line + 1}: ${message}\n  ${code.split("\n")[line]?.trim() ?? ""}`;
};

export const getInitializationCodeDiagnostics = (
  { typescript, declarations }: BackendResources,
  code: string,
  customComponentNames: string[] = [],
) => {
  const files = new Map([
    ["/types.d.ts", declarations.types],
    ["/globals.d.ts", declarations.globals],
    ["/initialCodeGlobals.d.ts", declarations.initialCodeGlobals],
    ["/components.d.ts", buildCustomComponentDeclarations(customComponentNames, declarations.globals)],
    [snippetFileName, code],
  ]);

  const options: ts.CompilerOptions = {
    target: typescript.ScriptTarget.ESNext,
    module: typescript.ModuleKind.ESNext,
    // The worker environment: `console`, `self` and friends, but no DOM.
    lib: ["lib.esnext.d.ts", "lib.webworker.d.ts"],
    // Anything but `moduleDetection: "force"` - forcing modules would drop every ambient global.
    strict: false,
    noImplicitAny: false,
    noUnusedLocals: false,
    noEmit: true,
    // Everything but the snippet is a declaration file, so skipping lib checks would hide a broken
    // generated declaration and leave the check passing while validating nothing.
    skipLibCheck: false,
    types: [],
  };

  const libFileName = typescript.getDefaultLibFilePath(options);
  const libDirectory = libFileName.slice(0, libFileName.lastIndexOf("/"));

  const host = typescript.createCompilerHost(options);
  const readDiskFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, ...rest) => {
    const virtual = files.get(fileName);

    return virtual === undefined
      ? readDiskFile(fileName, languageVersion, ...rest)
      : typescript.createSourceFile(fileName, virtual, languageVersion, true);
  };
  host.fileExists = (fileName) => files.has(fileName) || typescript.sys.fileExists(fileName);
  host.readFile = (fileName) => files.get(fileName) ?? typescript.sys.readFile(fileName);
  host.getDefaultLibFileName = () => libFileName;
  host.getDefaultLibLocation = () => libDirectory;
  // The globals files import `./types`, which is virtual - the default resolver only looks on disk,
  // and without this every scanned type silently degrades to `any`.
  host.resolveModuleNameLiterals = (literals, containingFile) =>
    literals.map(({ text }) => {
      const directory = containingFile.slice(0, containingFile.lastIndexOf("/"));
      const resolvedFileName = `${directory}/${text.replace(/^\.\//, "")}.d.ts`;

      return files.has(resolvedFileName)
        ? { resolvedModule: { resolvedFileName, extension: typescript.Extension.Dts } }
        : { resolvedModule: undefined };
    });

  const program = typescript.createProgram([...files.keys()], options, host);

  return typescript.getPreEmitDiagnostics(program);
};

/**
 * Typechecks initialization code against the declarations scanned out of the app, returning the
 * problems as text - or `undefined` when there are none.
 *
 * The snippet is compiled verbatim as its own file, and as a *script* rather than a module: that is
 * what the worker runs it as, so the augmented globals are in scope, top-level `await` and `return`
 * are errors exactly as they are at runtime, and every diagnostic's line number is the user's own.
 */
export const typecheckInitializationCode = (
  backendResources: BackendResources,
  code: string,
  customComponentNames: string[] = [],
): string | undefined => {
  const { typescript } = backendResources;

  const diagnostics = getInitializationCodeDiagnostics(backendResources, code, customComponentNames).filter(
    ({ category }) => category === typescript.DiagnosticCategory.Error,
  );

  const snippetDiagnostics = diagnostics.filter(({ file }) => file?.fileName === snippetFileName);
  if (!snippetDiagnostics.length) {
    return undefined;
  }

  const maxReported = 20;
  const reported = snippetDiagnostics
    .slice(0, maxReported)
    .map((diagnostic) => formatDiagnostic(typescript, diagnostic, code));
  if (snippetDiagnostics.length > maxReported) {
    reported.push(`(... and ${snippetDiagnostics.length - maxReported} more)`);
  }

  return [
    `[WARNING] TypeScript found ${snippetDiagnostics.length} problem(s) in the new initialization code. The change WAS applied.`,
    ...reported,
  ].join("\n");
};

export const editInitializationCodeTool = new CustomElementToolImplementation(
  {
    name: editInitializationCodeToolName,
    title: "Edit Custom element's initialization code",
    description:
      // language=markdown
      `
Change a \`${CustomElement.typeName}\` element's \`initializationCode\`.
See the \`operation\` parameter for the available ways to change it.

Read the \`${customConstraintsTopicName}\` docs topic before using this tool -
its API and conventions cannot be guessed.
`.trim(),
    inputSchema: z.object({ operation: editTextOperation }),
  },

  function (targetElement, { operation }, elementName, puzzleName) {
    targetElement.config.initializationCode = editText(targetElement.config.initializationCode, operation);

    return `Updated "${elementName}"'s initialization code in puzzle "${puzzleName}".`;
  },

  function (targetElement, _params, resources) {
    // TODO: do the same typecheck when creating a new custom element
    return typecheckInitializationCode(
      resources,
      targetElement.config.initializationCode,
      Object.keys(targetElement.config.customComponents),
    );
  },
);
