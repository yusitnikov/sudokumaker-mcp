import type { BackendResources } from "../../BackendResources";
import {
  formatSnippetProblems,
  getSnippetDiagnostics,
  getSnippetProblems,
  type SnippetPosition,
  type SnippetProblem,
  type SnippetScope,
  type ToAuthorSpan,
} from "./typecheckSnippet";
// Types only - erased by `verbatimModuleSyntax`, so the compiler never reaches the page bundle.
import type * as ts from "typescript";

const typesImport = (name: string) => `import("./types").${name}`;
const hookArg = (args: string, member: "instance" | "puzzle") => `${typesImport(args)}["${member}"]`;
const solverActions = `Generator<${typesImport("SolverAction")}, void, undefined>`;

/**
 * The five functions a component may declare, and what the app passes each one.
 *
 * `params` are the leading arguments whose types are known. The two hooks marked `variadic` are
 * called with the component's own constructor arguments after them, which are unknowable and stay
 * untyped; the other three are called with exactly `params`, so anything further the author declares
 * is always `undefined` and is reported.
 *
 * The parameter types come from the scanner - it captures each hook's live `arguments` - while the
 * return types are transcribed by hand from the probe component it installs, so they are the part
 * to re-derive first if a component ever warns inexplicably.
 */
const hooks: Record<string, { params: string[]; returns: string; variadic?: true }> = {
  getAffectedCells: { params: [], returns: `${typesImport("CellId")}[]`, variadic: true },
  setParams: { params: [hookArg("SetParamsArgs", "instance")], returns: "void", variadic: true },
  initialize: {
    params: [hookArg("InitializeArgs", "instance"), hookArg("InitializeArgs", "puzzle")],
    returns: solverActions,
  },
  validate: {
    params: [hookArg("ValidateArgs", "instance"), hookArg("ValidateArgs", "puzzle")],
    returns: "boolean",
  },
  update: {
    params: [hookArg("UpdateArgs", "instance"), hookArg("UpdateArgs", "puzzle")],
    returns: solverActions,
  },
};

/** A hook the component declares: the function itself, and the statement to hang its JSDoc on. */
interface DeclaredHook {
  name: string;
  fn: ts.SignatureDeclaration;
  statement: ts.Statement;
}

/**
 * The hooks declared at the top level of the component's code.
 *
 * The app detects a hook with `typeof x === "function"`, which sees a `const`/`var` binding just as
 * it sees a function declaration - so all three forms are recognised here. One nested inside a block
 * is left alone, matching what the app would find.
 */
const findHooks = (typescript: BackendResources["typescript"], sourceFile: ts.SourceFile) => {
  const declared: DeclaredHook[] = [];

  for (const statement of sourceFile.statements) {
    if (typescript.isFunctionDeclaration(statement)) {
      const name = statement.name?.text;
      if (name && hooks[name]) {
        declared.push({ name, fn: statement, statement });
      }
      continue;
    }

    if (typescript.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const { name, initializer } = declaration;
        if (
          typescript.isIdentifier(name) &&
          hooks[name.text] &&
          initializer &&
          (typescript.isArrowFunction(initializer) || typescript.isFunctionExpression(initializer))
        ) {
          declared.push({ name: name.text, fn: initializer, statement });
        }
      }
    }
  }

  return declared;
};

/**
 * The JSDoc line that types one hook's parameters and return.
 *
 * `@param` binds by *name*, so a tag is emitted for every parameter the author declared, in order,
 * and none beyond them: a tag naming a parameter they omitted is an error, and omitting one is
 * legal since the app passes the full set regardless. A destructured parameter has no name to bind
 * to, so it gets a placeholder - skipping it would let the next tag bind to its position and type
 * the wrong parameter.
 */
const buildJsDoc = (typescript: BackendResources["typescript"], { name, fn }: DeclaredHook) => {
  const { params, returns } = hooks[name];
  const tags: string[] = [];

  fn.parameters.forEach((parameter, index) => {
    const type = params[index];
    if (!type) {
      return;
    }

    tags.push(`@param {${type}} ${typescript.isIdentifier(parameter.name) ? parameter.name.text : `options${index}`}`);
  });

  tags.push(`@returns {${returns}}`);

  return `/** ${tags.join(" ")} */`;
};

/**
 * Parameters the author declared that the app will never pass, as one problem over all of them.
 *
 * TypeScript cannot report these: the hook is a declaration, not a call, so nothing checks it
 * against the app's argument list - and a `@param` tag naming a parameter that should not exist
 * would land on the generated line with a message about JSDoc. So the checker says it itself.
 */
const findExtraParameters = (sourceFile: ts.SourceFile, { name, fn }: DeclaredHook): SnippetProblem[] => {
  const { params, variadic } = hooks[name];
  if (variadic) {
    return [];
  }

  const extra = fn.parameters.slice(params.length);
  if (!extra.length) {
    return [];
  }

  return [
    {
      start: sourceFile.getLineAndCharacterOfPosition(extra[0].getStart(sourceFile)),
      end: sourceFile.getLineAndCharacterOfPosition(extra[extra.length - 1].getEnd()),
      message: `'${name}' must have exactly ${params.length} arguments`,
    },
  ];
};

/**
 * The component's code with a JSDoc line above each hook, plus a map back to the author's lines.
 *
 * Typing the hooks is what makes the check worth anything - without it `instance` and `puzzle` are
 * implicitly `any` inside the bodies, where all the logic is. The annotations are whole lines, so
 * the line numbers shift and every diagnostic has to be mapped back before it is reported.
 */
const annotate = (typescript: BackendResources["typescript"], code: string) => {
  const sourceFile = typescript.createSourceFile("/component.js", code, typescript.ScriptTarget.ESNext, true);

  const jsDocByLine = new Map<number, string>();
  /** The hook each annotation line belongs to, spanning the author's source. */
  const hookRangeByLine = new Map<number, { start: SnippetPosition; end: SnippetPosition }>();
  const problems: SnippetProblem[] = [];

  for (const hook of findHooks(typescript, sourceFile)) {
    const start = sourceFile.getLineAndCharacterOfPosition(hook.statement.getStart(sourceFile));
    jsDocByLine.set(start.line, buildJsDoc(typescript, hook));
    hookRangeByLine.set(start.line, { start, end: sourceFile.getLineAndCharacterOfPosition(hook.statement.getEnd()) });
    problems.push(...findExtraParameters(sourceFile, hook));
  }

  const annotated: string[] = [];
  /** The author's line for each annotated line - an injected line maps to the hook it annotates. */
  const authorLines: number[] = [];
  /** Which annotated lines are ours, so a diagnostic on one is reported over the whole hook. */
  const injected = new Set<number>();

  code.split("\n").forEach((text, authorLine) => {
    const jsDoc = jsDocByLine.get(authorLine);
    if (jsDoc !== undefined) {
      injected.add(annotated.length);
      annotated.push(jsDoc);
      /*
       * An annotation carries the hook's declared types, so TypeScript reports anything about the
       * declaration itself against this line - "must return a value" for a hook that never does.
       * That is the author's defect, about the function on the next line, so it is attributed
       * there rather than dismissed as a problem in generated code.
       *
       * TODO: the wording still comes from TypeScript and talks about a "declared type" the author
       *   never wrote - it is this annotation. Say what is actually wrong instead.
       */
      authorLines.push(authorLine);
    }

    annotated.push(text);
    authorLines.push(authorLine);
  });

  /**
   * A compiled span as the author's own.
   *
   * A span starting on an annotation becomes the whole hook that annotation belongs to: the
   * generated line's columns mean nothing in the author's source, and what the compiler is
   * describing is the declaration below it. Every other span keeps its columns and moves to the
   * lines the author wrote.
   */
  const toAuthorSpan: ToAuthorSpan = ({ start, end }) => {
    const hookRange = injected.has(start.line) ? hookRangeByLine.get(authorLines[start.line]) : undefined;

    return (
      hookRange ?? {
        start: { line: authorLines[start.line] ?? start.line, character: start.character },
        end: { line: authorLines[end.line] ?? end.line, character: end.character },
      }
    );
  };

  return { annotated: annotated.join("\n"), toAuthorSpan, problems };
};

/** What a custom component is checked against - its scope's `helpers`, and nothing else. */
const scope = ({ declarations }: BackendResources): SnippetScope => ({
  globals: declarations.customComponentGlobals,
});

export const getCustomComponentCodeDiagnostics = (backendResources: BackendResources, code: string) =>
  getSnippetDiagnostics(
    backendResources,
    scope(backendResources),
    annotate(backendResources.typescript, code).annotated,
  );

/**
 * Typechecks a custom component's code against the declarations scanned out of the app, returning
 * the problems as text - or `undefined` when there are none.
 *
 * Each hook the component declares is annotated with the types the app calls it with, so the checker
 * sees `instance` and `puzzle` for what they are inside the bodies. Diagnostics are reported against
 * the author's own lines, never the annotated ones.
 *
 * The annotator's own findings - a parameter the app never passes - are reported alongside the
 * compiler's, since the two are equally the author's business.
 */
export const typecheckCustomComponentCode = (backendResources: BackendResources, code: string): string | undefined => {
  const { annotated, toAuthorSpan, problems } = annotate(backendResources.typescript, code);

  const compilerProblems = getSnippetProblems(backendResources, scope(backendResources), code, {
    compiled: annotated,
    toAuthorSpan,
  });

  return formatSnippetProblems([...problems, ...compilerProblems], code, "component code");
};
