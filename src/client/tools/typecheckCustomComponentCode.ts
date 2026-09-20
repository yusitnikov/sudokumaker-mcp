import type { BackendResources } from "../../BackendResources";
import {
  type SnippetPosition,
  type SnippetProblem,
  SnippetTypescript,
  type SnippetTypescriptAnnotatorResult,
} from "./typecheckSnippet";
// Types only - erased by `verbatimModuleSyntax`, so the compiler never reaches the page bundle.
import type * as ts from "typescript";

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
  getAffectedCells: {
    params: [],
    returns: "CellId[]",
    variadic: true,
  },
  setParams: {
    params: ["DynamicInstance"],
    returns: "void",
    variadic: true,
  },
  initialize: {
    params: ["DynamicInstance", "Puzzle"],
    returns: "Generator<Change, void, undefined>",
  },
  validate: {
    params: ["DynamicInstance", "Puzzle"],
    returns: "boolean",
  },
  update: {
    params: ["DynamicInstance", "Puzzle"],
    returns: "Generator<Change, void, undefined>",
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
 * The type the author gave a parameter in their own JSDoc, as one line.
 *
 * Read off the tag's type node as source text rather than rebuilt, so every spelling survives
 * whole - a union, a generic, an inline object literal, a `...rest`. Nothing but the JSDoc is
 * consulted: a parameter the author left untagged has no type here, whatever the compiler might
 * infer for it elsewhere.
 *
 * A type written across several lines carries whatever margin the author used into that text - the
 * leading `*` is conventional rather than required, and may be on some lines and not others. The
 * annotation it goes into is a single line, so each break takes the margin after it and becomes one
 * space; left in, the break would split the annotation and shift every line below it out of step
 * with the author's source.
 */
const authorType = (
  typescript: BackendResources["typescript"],
  sourceFile: ts.SourceFile,
  parameter: ts.ParameterDeclaration,
) => {
  for (const tag of typescript.getJSDocParameterTags(parameter)) {
    if (tag.typeExpression) {
      const { type } = tag.typeExpression;
      const isVariadic = typescript.isJSDocVariadicType(type);
      // An author who spelled the `...` themselves already has it in the text.
      const written = isVariadic ? type.type.getText(sourceFile) : type.getText(sourceFile);

      return {
        text:
          written.trim() === "*"
            ? "any"
            : written
                // remove the "*" characters that are parts of JSDoc's format
                .replace(/\n\s*\*/g, "\n")
                // compact whitespace character runs, including the line breaks
                .replace(/\s+/g, " ")
                .trim(),
        variadic: isVariadic,
      };
    }
  }

  return undefined;
};

/**
 * The JSDoc line that types one hook's parameters and return.
 *
 * A tag is emitted for *every* parameter the author declared, because only the JSDoc block nearest
 * the function is read: a block of the author's own is skipped past for everything but `@overload`,
 * so a parameter this one leaves out falls to implicit `any` rather than to their tag. The
 * parameters the app's argument list defines are typed from `hooks`, and the rest carry the author's
 * own type where they wrote one - and no type at all where they did not, leaving whatever the
 * compiler can infer from a default value in force.
 *
 * `@param` binds by *name*, so the tags follow the author's own names and order. A destructured
 * parameter has no name to bind to, so it gets a placeholder - skipping it would let the next tag
 * bind to its position and type the wrong parameter.
 */
const buildJsDoc = (
  typescript: BackendResources["typescript"],
  sourceFile: ts.SourceFile,
  { name, fn }: DeclaredHook,
) => {
  const { params, returns, variadic } = hooks[name];
  const tags: string[] = [];

  fn.parameters.forEach((parameter, index) => {
    const known = params[index];
    /*
     * Past the known parameters only a variadic hook has anything to type: the other three are
     * called with exactly `params`, so a further parameter is always `undefined` and typing it
     * would make a body that reads it look sound. It is reported as an extra parameter instead.
     */
    if (known === undefined && !variadic) {
      return;
    }

    const isInstance = known === "DynamicInstance";
    const own = known === undefined || isInstance ? authorType(typescript, sourceFile, parameter) : undefined;
    /*
     * A rest parameter collects every remaining argument, so its tag types one of them and is
     * spelled `...T` - tagging it as the array itself would give each argument the whole list's
     * type. The author may have spelled that themselves, in which case it is not repeated.
     */
    const rest = parameter.dotDotDotToken !== undefined || own?.variadic === true;
    const type =
      isInstance && own?.text
        ? `Instance & (${["any", "object"].includes(own.text) ? "{}" : own.text})`
        : (known ?? own?.text);
    /*
     * A constructor argument the author did not type is tagged without one rather than as `{any}`: a
     * tag's type is the parameter's declared type and overrides what the compiler would otherwise
     * infer, so `{any}` would erase the type a default value carries. The tag itself still has to be
     * written, since `@param` binds by name and a missing one lets the next tag take its position.
     */
    const annotation = type === undefined ? "" : `{${rest ? "..." : ""}${type}} `;

    tags.push(
      `@param ${annotation}${typescript.isIdentifier(parameter.name) ? parameter.name.text : `options${index}`}`,
    );
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

export class CustomComponentCodeTypescript extends SnippetTypescript {
  constructor(backendResources: BackendResources) {
    super(backendResources, { globals: backendResources.declarations.customComponentGlobals }, "component code");
  }

  /**
   * The component's code with a JSDoc line above each hook, plus a map back to the author's lines.
   *
   * Typing the hooks is what makes the check worth anything - without it `instance` and `puzzle` are
   * implicitly `any` inside the bodies, where all the logic is. The annotations are whole lines, so
   * the line numbers shift and every diagnostic has to be mapped back before it is reported.
   */
  protected annotate(code: string): SnippetTypescriptAnnotatorResult {
    const { typescript } = this.backendResources;

    const sourceFile = typescript.createSourceFile("/component.js", code, typescript.ScriptTarget.ESNext, true);

    const jsDocByLine = new Map<number, string>();
    /** The hook each annotation line belongs to, spanning the author's source. */
    const hookRangeByLine = new Map<number, { start: SnippetPosition; end: SnippetPosition }>();
    const problems: SnippetProblem[] = [];

    for (const hook of findHooks(typescript, sourceFile)) {
      const start = sourceFile.getLineAndCharacterOfPosition(hook.statement.getStart(sourceFile));
      jsDocByLine.set(start.line, buildJsDoc(typescript, sourceFile, hook));
      hookRangeByLine.set(start.line, {
        start,
        end: sourceFile.getLineAndCharacterOfPosition(hook.statement.getEnd()),
      });
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

    return {
      annotated: annotated.join("\n"),
      /**
       * A compiled span as the author's own.
       *
       * A span starting on an annotation becomes the whole hook that annotation belongs to: the
       * generated line's columns mean nothing in the author's source, and what the compiler is
       * describing is the declaration below it. Every other span keeps its columns and moves to the
       * lines the author wrote.
       */
      toAuthorSpan: ({ start, end }) => {
        const hookRange = injected.has(start.line) ? hookRangeByLine.get(authorLines[start.line]) : undefined;

        return (
          hookRange ?? {
            start: { line: authorLines[start.line] ?? start.line, character: start.character },
            end: { line: authorLines[end.line] ?? end.line, character: end.character },
          }
        );
      },
      problems,
    };
  }
}
