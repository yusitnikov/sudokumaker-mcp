import type { BackendResources } from "../../BackendResources";
import {
  type SnippetPosition,
  type SnippetProblem,
  SnippetTypescript,
  type SnippetTypescriptAnnotatorResult,
} from "./typecheckSnippet";
// Types only - erased by `verbatimModuleSyntax`, so the compiler never reaches the page bundle.
import type * as ts from "typescript";
import { TypescriptProgram } from "../../typescript/TypescriptProgram";

const allHookNames = ["getAffectedCells", "setParams", "initialize", "validate", "update"];

/** A value the app passes, shared by every hook that receives it. */
interface ResolvedArgument {
  /** What the authors declared for it, across all hooks. Emitted as an intersection. */
  typeVariants: Set<string>;
  /** The argument collects every remaining one, and `typeVariants` is its item's type. */
  variadic?: boolean;
  /** The app owns this type - a `@param` for it is ignored. */
  final?: boolean;
}

interface ResolvedHook {
  args: ResolvedArgument[];
  returns: string;
}

/** A hook the component declares: the function itself, and the statement to hang its JSDoc on. */
interface DeclaredHook {
  name: string;
  fn: ts.SignatureDeclaration;
  statement: ts.Statement;
  args: DeclaredArgument[];
}

interface DeclaredArgument {
  declaration: ts.ParameterDeclaration;
  isRest: boolean;
  jsDocType?: string;
}

/**
 * The hooks declared at the top level of the component's code.
 *
 * The app detects a hook with `typeof x === "function"`, which sees a `const`/`var` binding just as
 * it sees a function declaration - so all three forms are recognised here. One nested inside a block
 * is left alone, matching what the app would find.
 */
const findHooks = (typescript: BackendResources["typescript"], sourceFile: ts.SourceFile) => {
  const declared: Omit<DeclaredHook, "args">[] = [];

  for (const statement of sourceFile.statements) {
    if (typescript.isFunctionDeclaration(statement)) {
      const name = statement.name?.text;
      if (name && allHookNames.includes(name)) {
        declared.push({ name, fn: statement, statement });
      }
      continue;
    }

    if (typescript.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const { name, initializer } = declaration;
        if (
          typescript.isIdentifier(name) &&
          allHookNames.includes(name.text) &&
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
  for (const { typeExpression } of typescript.getJSDocParameterTags(parameter)) {
    if (!typeExpression) {
      continue;
    }

    const { type } = typeExpression;
    // An author who spelled the `...` themselves already has it in the text.
    const written = typescript.isJSDocVariadicType(type) ? type.type.getText(sourceFile) : type.getText(sourceFile);

    return written.trim() === "*"
      ? "any"
      : written
          // remove the "*" characters that are parts of JSDoc's format
          .replace(/\n\s*\*/g, "\n")
          // compact whitespace character runs, including the line breaks
          .replace(/\s+/g, " ")
          .trim();
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
  declaredArgs: DeclaredArgument[],
  { args: resolvedArgs, returns }: ResolvedHook,
) => {
  const tags: string[] = [];

  declaredArgs.forEach(({ declaration: { name }, isRest }, index) => {
    const resolvedArg = resolvedArgs[index];
    if (!resolvedArg) {
      return;
    }

    const type = [...resolvedArg.typeVariants].map((s) => `(${s})`).join(" & ");
    const annotation = type ? `{${isRest ? "..." : ""}${type}}` : "";

    tags.push(`@param ${annotation} ${typescript.isIdentifier(name) ? name.text : `options${index}`}`);
  });

  tags.push(`@returns {${returns}}`);

  return `/** ${tags.join(" ")} */`;
};

let baseProgram: TypescriptProgram | undefined;

export class CustomComponentCodeTypescript extends SnippetTypescript {
  constructor(backendResources: BackendResources) {
    super(backendResources, "component code");
  }

  getProgram() {
    baseProgram ??= super.getProgram().withFiles({
      "/customComponentGlobals.d.ts": this.backendResources.declarations.customComponentGlobals,
    });

    return baseProgram;
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

    const sourceFile = typescript.createSourceFile(
      SnippetTypescript.snippetFileName,
      code,
      typescript.ScriptTarget.ESNext,
      true,
      typescript.ScriptKind.JS,
    );

    const jsDocByLine = new Map<number, string>();
    /** The hook each annotation line belongs to, spanning the author's source. */
    const hookRangeByLine = new Map<number, { start: SnippetPosition; end: SnippetPosition }>();
    const problems: SnippetProblem[] = [];

    // region Find declared hooks in the snippet
    const declaredHooks = findHooks(typescript, sourceFile).map(
      (hook): DeclaredHook => ({
        ...hook,
        args: hook.fn.parameters.map((declaration) => ({
          declaration,
          isRest: !!declaration.dotDotDotToken,
          jsDocType: authorType(typescript, sourceFile, declaration),
        })),
      }),
    );
    const declaredGetAffectedCells = declaredHooks.find(({ name }) => name === "getAffectedCells");
    const declaredSetParams = declaredHooks.find(({ name }) => name === "setParams");
    // endregion

    // region Initialize hook argument descriptors
    const constructorArgs = Array(
      Math.max(declaredGetAffectedCells?.args.length ?? 1, declaredSetParams?.args.length ?? 0),
    )
      .fill(0)
      .map((): ResolvedArgument => ({ typeVariants: new Set() }));
    if (!declaredGetAffectedCells) {
      constructorArgs[0] = { typeVariants: new Set(["CellId[]"]), final: true };
    }

    const instanceArg: ResolvedArgument = { typeVariants: new Set() };
    const puzzleArg: ResolvedArgument = { typeVariants: new Set(["Puzzle"]), final: true };

    const resolvedHooks: Record<string, ResolvedHook> = {
      getAffectedCells: {
        args: constructorArgs,
        returns: "CellId[]",
      },
      setParams: {
        args: [instanceArg, ...constructorArgs],
        returns: "void",
      },
      initialize: {
        args: [instanceArg, puzzleArg],
        returns: "Generator<Change, void, undefined>",
      },
      validate: {
        args: [instanceArg, puzzleArg],
        returns: "boolean",
      },
      update: {
        args: [instanceArg, puzzleArg],
        returns: "Generator<Change, void, undefined>",
      },
    };
    // endregion

    // Merge declared arguments of the same meaning together
    for (const { name, args: declaredArgs } of declaredHooks) {
      const resolvedArgs = resolvedHooks[name].args;

      const lastDeclaredArg = declaredArgs[declaredArgs.length - 1];
      const hasRest = lastDeclaredArg?.isRest;

      if (hasRest) {
        resolvedArgs[resolvedArgs.length - 1].variadic = true;
      }

      for (const [index, resolvedArg] of resolvedArgs.entries()) {
        if (resolvedArg.final) {
          continue;
        }

        let declaredArg = declaredArgs[index];
        if (hasRest) {
          declaredArg ??= lastDeclaredArg;
        }
        if (!declaredArg) {
          continue;
        }

        if (declaredArg.jsDocType) {
          resolvedArg.typeVariants.add(declaredArg.jsDocType);
        }
      }
    }

    // Finalize the "instance" argument
    if (instanceArg.typeVariants.size) {
      instanceArg.typeVariants.delete("any");
      instanceArg.typeVariants.delete("object");
      instanceArg.typeVariants.delete("unknown");
      instanceArg.typeVariants.delete("{}");
      instanceArg.typeVariants.delete("{ }");
      instanceArg.typeVariants = new Set(["Instance", ...instanceArg.typeVariants]);
    } else {
      instanceArg.typeVariants.add("DynamicInstance");
    }

    // Compile and insert the generated JSDocs
    for (const { name, statement, args: declaredArgs } of declaredHooks) {
      const start = sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile));
      jsDocByLine.set(start.line, buildJsDoc(typescript, declaredArgs, resolvedHooks[name]));
      hookRangeByLine.set(start.line, {
        start,
        end: sourceFile.getLineAndCharacterOfPosition(statement.getEnd()),
      });
    }

    // Report extra arguments for non-variadic hooks
    for (const { name, fn } of declaredHooks) {
      const { args } = resolvedHooks[name];

      const extra = fn.parameters.slice(args.length);
      if (extra.length) {
        problems.push({
          start: sourceFile.getLineAndCharacterOfPosition(extra[0].getStart(sourceFile)),
          end: sourceFile.getLineAndCharacterOfPosition(extra[extra.length - 1].getEnd()),
          message: `'${name}' must have exactly ${args.length} arguments`,
        });
      }
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
