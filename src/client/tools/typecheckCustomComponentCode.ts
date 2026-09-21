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
class ResolvedArgument {
  /** What the authors declared for it, across all hooks. Emitted as an intersection. */
  private typeVariants: Set<string>;

  constructor(
    public name = "",
    typeVariants: string[] = [],
    /** The app owns this type - a `@param` for it is ignored. */
    readonly final = false,
    /** The argument collects every remaining one, and `typeVariants` is its item's type. */
    public variadic = false,
  ) {
    this.typeVariants = new Set(typeVariants);
  }

  get hasType() {
    return this.typeVariants.size !== 0;
  }

  get type() {
    return [...this.typeVariants]
      .map((s) => (this.typeVariants.size === 1 || /^\w+$/.test(s) ? s : `(${s})`))
      .join(" & ");
  }

  pushType(...types: string[]) {
    for (const type of types) {
      this.typeVariants.add(type);
    }
  }

  unshiftType(...types: string[]) {
    this.typeVariants = new Set([...types, ...this.typeVariants]);
  }

  deleteType(...types: string[]) {
    for (const type of types) {
      this.typeVariants.delete(type);
    }
  }
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
  name?: string;
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
const buildJsDoc = (declaredArgs: DeclaredArgument[], { args: resolvedArgs, returns }: ResolvedHook) => {
  const tags = declaredArgs.slice(0, resolvedArgs.length).map(({ name, isRest }, index) => {
    const resolvedArg = resolvedArgs[index];

    const annotation = resolvedArg.hasType ? `{${isRest ? "..." : ""}${resolvedArg.type}}` : "";

    return `@param ${annotation} ${name ?? `__arg${index + 1}`}`;
  });

  tags.push(`@returns {${returns}}`);

  return `/** ${tags.join(" ")} */`;
};

let baseProgram: TypescriptProgram | undefined;

export class CustomComponentCodeTypescript extends SnippetTypescript {
  constructor(
    backendResources: BackendResources,
    /** Custom components map: name => code */
    private readonly customComponents: Record<string, string>,
  ) {
    super(backendResources, "component code");
  }

  typecheckComponent(name: string) {
    return this.typecheck(this.customComponents[name]);
  }

  getProgram() {
    baseProgram ??= super.getProgram().withFiles({
      "/customComponentGlobals.d.ts": this.backendResources.declarations.customComponentGlobals,
    });

    const componentNames = Object.keys(this.customComponents);
    if (componentNames.length === 0) {
      return baseProgram;
    }

    const classesCode = this.getClassesCode();
    const propsCode = componentNames.map((name) => `"${name}": typeof ${name}`).join(", ");

    return baseProgram.withFiles({
      "/customComponentsProp.d.ts": `import { Component } from "./types";

${classesCode}

declare global {
  interface CustomComponents { ${propsCode} }
}`,
    });
  }

  parseHooks(code: string) {
    const { typescript } = this.backendResources;

    const sourceFile = typescript.createSourceFile(
      SnippetTypescript.snippetFileName,
      code,
      typescript.ScriptTarget.ESNext,
      true,
      typescript.ScriptKind.JS,
    );

    // region Find declared hooks in the snippet
    const declaredHooks = findHooks(typescript, sourceFile).map(
      (hook): DeclaredHook => ({
        ...hook,
        args: hook.fn.parameters.map((declaration) => ({
          name: typescript.isIdentifier(declaration.name) ? declaration.name.text : undefined,
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
      Math.max(declaredGetAffectedCells?.args.length ?? 1, (declaredSetParams?.args.length ?? 1) - 1),
    )
      .fill(0)
      .map(() => new ResolvedArgument());
    if (!declaredGetAffectedCells) {
      constructorArgs[0] = new ResolvedArgument("cellIds", ["CellId[]"], true);
    }

    const instanceArg = new ResolvedArgument("instance");
    const puzzleArg = new ResolvedArgument("puzzle", ["Puzzle"], true);

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

        if (declaredArg?.name) {
          resolvedArg.name = declaredArg.name;
        }

        if (hasRest) {
          declaredArg ??= lastDeclaredArg;
        }
        if (!declaredArg) {
          continue;
        }

        if (declaredArg.jsDocType) {
          resolvedArg.pushType(declaredArg.jsDocType);
        }
      }
    }

    // Finalize the "instance" argument
    if (instanceArg.hasType) {
      instanceArg.deleteType("any", "object", "unknown", "{}", "{ }");
      instanceArg.unshiftType("Instance");
    } else {
      instanceArg.pushType("DynamicInstance");
    }

    // Fix empty and duplicated constructor arg names
    const forbiddenArgNames = new Set<string>(["", "name"]);
    for (const [index, arg] of constructorArgs.entries()) {
      if (forbiddenArgNames.has(arg.name)) {
        arg.name = `__arg${index + 1}`;
      } else {
        forbiddenArgNames.add(arg.name);
      }
    }

    return {
      sourceFile,
      declaredHooks,
      resolvedHooks,
      constructorArgs,
    };
  }

  getConstructorArgs(code: string) {
    return (
      "name: string, " +
      this.parseHooks(code)
        .constructorArgs.map(
          ({ name, type, variadic }) => `${variadic ? "..." : ""}${name}: ${type || "any"}${variadic ? "[]" : ""}`,
        )
        .join(", ")
    );
  }

  getClassCode(name: string, code: string) {
    return `class ${name} extends Component { constructor(${this.getConstructorArgs(code)}); }`;
  }

  getClassesCode(offset = "") {
    return Object.entries(this.customComponents)
      .map(([name, code]) => `${offset}${this.getClassCode(name, code)}\n`)
      .join("");
  }

  /**
   * The component's code with a JSDoc line above each hook, plus a map back to the author's lines.
   *
   * Typing the hooks is what makes the check worth anything - without it `instance` and `puzzle` are
   * implicitly `any` inside the bodies, where all the logic is. The annotations are whole lines, so
   * the line numbers shift and every diagnostic has to be mapped back before it is reported.
   */
  protected annotate(code: string): SnippetTypescriptAnnotatorResult {
    const jsDocByLine = new Map<number, string>();
    /** The hook each annotation line belongs to, spanning the author's source. */
    const hookRangeByLine = new Map<number, { start: SnippetPosition; end: SnippetPosition }>();
    const problems: SnippetProblem[] = [];

    const { sourceFile, declaredHooks, resolvedHooks } = this.parseHooks(code);

    // Compile and insert the generated JSDocs
    for (const { name, statement, args: declaredArgs } of declaredHooks) {
      const start = sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile));
      jsDocByLine.set(start.line, buildJsDoc(declaredArgs, resolvedHooks[name]));
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
