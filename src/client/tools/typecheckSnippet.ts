import type { BackendResources } from "../../BackendResources";
// Types only - erased by `verbatimModuleSyntax`, so the compiler never reaches the page bundle.
import type * as ts from "typescript";

/**
 * Where the snippet lives in the virtual program - its diagnostics are the only ones reported.
 *
 * It is checked as JavaScript, which is what the worker runs. TypeScript rejects things that are
 * ordinary JS - redeclaring a function, or growing an object literal past the shape it was created
 * with - and reporting those would be a false positive on correct code.
 */
export const snippetFileName = "/snippet.js";

/** Maps a line of the compiled snippet back to the line the author wrote. */
export type ToAuthorLine = (snippetLine: number) => number;

/** What one scope adds to the program the two of them share. */
export interface SnippetScope {
  /**
   * The scope's own globals - `initialCodeGlobals` or `customComponentGlobals`. They declare
   * different `helpers`, so a program takes one or the other, never both.
   */
  globals: string;
  /** Anything else the scope declares, by file name - e.g. the element's own components. */
  extraDeclarations?: Record<string, string>;
}

/**
 * The virtual program a snippet is checked in: the declarations every scope shares, the scope's own,
 * and the snippet itself.
 */
const buildFiles = ({ declarations }: BackendResources, { globals, extraDeclarations }: SnippetScope, code: string) =>
  new Map([
    ["/types.d.ts", declarations.types],
    ["/globals.d.ts", declarations.globals],
    ["/scopeGlobals.d.ts", globals],
    ...Object.entries(extraDeclarations ?? {}),
    [snippetFileName, code],
  ]);

/** Renders one diagnostic as `line N: message`, followed by the offending source line. */
const formatDiagnostic = (
  typescript: BackendResources["typescript"],
  diagnostic: ts.Diagnostic,
  code: string,
  toAuthorLine: ToAuthorLine,
) => {
  const message = typescript.flattenDiagnosticMessageText(diagnostic.messageText, " ");
  if (!diagnostic.file || diagnostic.start === undefined) {
    return message;
  }

  const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  const authorLine = toAuthorLine(line);

  return `line ${authorLine + 1}: ${message}\n  ${code.split("\n")[authorLine]?.trim() ?? ""}`;
};

/** Diagnostics for `code` checked in `scope`, including those of the declarations themselves. */
export const getSnippetDiagnostics = (backendResources: BackendResources, scope: SnippetScope, code: string) => {
  const { typescript } = backendResources;
  const files = buildFiles(backendResources, scope, code);

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
    // The snippet is JavaScript, so it has to be both allowed into the program and checked.
    allowJs: true,
    checkJs: true,
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
 * Typechecks a snippet against the declarations scanned out of the app, returning the problems as
 * text - or `undefined` when there are none.
 *
 * The snippet is compiled as a *script* rather than a module: that is what the worker runs it as, so
 * the augmented globals are in scope and top-level `await` and `return` are errors exactly as they
 * are at runtime.
 *
 * A scope that annotates the code before compiling it passes the annotated text as `compiled` and
 * its own `toAuthorLine`, so every reported number and echoed line stays the author's.
 */
export const typecheckSnippet = (
  backendResources: BackendResources,
  scope: SnippetScope,
  /** What the author wrote - the offending line is echoed from this. */
  code: string,
  /** Names the edited thing in the warning, e.g. "initialization code". */
  subject: string,
  { compiled = code, toAuthorLine = (line) => line }: { compiled?: string; toAuthorLine?: ToAuthorLine } = {},
): string | undefined => {
  const { typescript } = backendResources;

  const diagnostics = getSnippetDiagnostics(backendResources, scope, compiled).filter(
    ({ category }) => category === typescript.DiagnosticCategory.Error,
  );

  const snippetDiagnostics = diagnostics.filter(({ file }) => file?.fileName === snippetFileName);
  if (!snippetDiagnostics.length) {
    return undefined;
  }

  const maxReported = 20;
  const reported = snippetDiagnostics
    .slice(0, maxReported)
    .map((diagnostic) => formatDiagnostic(typescript, diagnostic, code, toAuthorLine));
  if (snippetDiagnostics.length > maxReported) {
    reported.push(`(... and ${snippetDiagnostics.length - maxReported} more)`);
  }

  return [
    `[WARNING] TypeScript found ${snippetDiagnostics.length} problem(s) in the new ${subject}. The change WAS applied.`,
    ...reported,
  ].join("\n");
};
