import type { BackendResources } from "../../BackendResources";
// Types only - erased by `verbatimModuleSyntax`, so the compiler never reaches the page bundle.
import type * as ts from "typescript";

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

/** One end of a problem's span, in the author's own source. */
export interface SnippetPosition {
  line: number;
  character: number;
}

/** The stretch of source a problem covers. */
export interface SnippetSpan {
  start: SnippetPosition;
  end: SnippetPosition;
}

/**
 * One thing wrong with the snippet, spanning part of the author's own source.
 *
 * A scope that finds problems of its own reports them in this shape, so they are counted, ordered
 * and rendered exactly as the compiler's are. Those carry no `code`, having no TypeScript error
 * number to name.
 */
export interface SnippetProblem extends SnippetSpan {
  message: string;
  code?: number;
}

export interface SnippetTypescriptAnnotatorResult {
  annotated: string;
  /**
   * Maps a span of the compiled snippet back to the author's own source.
   *
   * A scope that compiles the code verbatim needs none of this; one that injects lines supplies its
   * own, and may widen a span as well as move it - a diagnostic landing on an injected line has no
   * meaningful columns in the author's source, so the scope reports whatever that line belongs to.
   */
  toAuthorSpan?: (span: SnippetSpan) => SnippetSpan;
  problems?: SnippetProblem[];
}

export class SnippetTypescript {
  /**
   * Where the snippet lives in the virtual program - its diagnostics are the only ones reported.
   *
   * It is checked as JavaScript, which is what the worker runs. TypeScript rejects things that are
   * ordinary JS - redeclaring a function, or growing an object literal past the shape it was created
   * with - and reporting those would be a false positive on correct code.
   */
  private static readonly snippetFileName = "/snippet.js";

  constructor(
    readonly backendResources: BackendResources,
    readonly scope: SnippetScope,
    readonly subject: string,
  ) {}

  /** Diagnostics for `code` checked in `scope`, including those of the declarations themselves. */
  getDiagnostics(code: string) {
    const { typescript, declarations } = this.backendResources;

    const files = new Map([
      ["/types.d.ts", declarations.types],
      ["/globals.d.ts", declarations.globals],
      ["/scopeGlobals.d.ts", this.scope.globals],
      ...Object.entries(this.scope.extraDeclarations ?? {}),
      [SnippetTypescript.snippetFileName, code],
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
  }

  /**
   * The problems as the text a tool appends to its response - or `undefined` when there are none.
   *
   * Problems are reported in the order of the lines they sit on, whoever found them, so a scope that
   * contributes its own passes them in alongside the compiler's.
   */
  formatProblems(
    problems: SnippetProblem[],
    /** What the author wrote - the offending lines are echoed from this. */
    code: string,
  ): string | undefined {
    if (!problems.length) {
      return undefined;
    }

    const ordered = [...problems].sort((a, b) => a.start.line - b.start.line || a.start.character - b.start.character);

    /** How many source lines of one problem are shown before the rest are cut. */
    const maxEchoedLines = 10;
    /** How many problems are reported before the rest are cut */
    const maxReported = 20;

    const lines = code.split("\n");
    const reported = ordered.slice(0, maxReported).map(
      /**
       * One problem as the block `tsc` prints: the location and message, then the source it covers with
       * each line underlined beneath it.
       *
       * The location names the author's lines rather than a file position, the code being the only thing
       * the reader has. Line numbers are right-aligned in a gutter as wide as the widest of them, so the
       * source lines stay aligned with each other the way they are in the editor.
       */
      ({ start, end, message, code }) => {
        const location = start.line === end.line ? `line ${start.line + 1}` : `lines ${start.line + 1}-${end.line + 1}`;
        const error = code === undefined ? "error" : `error TS${code}`;

        const shown = Math.min(end.line - start.line + 1, maxEchoedLines);
        const gutterWidth = String(start.line + shown).length;

        const echoed: string[] = [];
        for (let offset = 0; offset < shown; offset++) {
          const line = start.line + offset;
          const text = lines[line] ?? "";
          const gutter = String(line + 1).padStart(gutterWidth);

          echoed.push(`${gutter} ${text}`);

          const squiggleStart = line === start.line ? start.character : 0;
          const squiggleLength = Math.max((line === end.line ? end.character : text.length) - squiggleStart, 1);
          echoed.push(" ".repeat(gutterWidth + 1 + squiggleStart) + "~".repeat(squiggleLength));
        }

        if (end.line - start.line + 1 > shown) {
          echoed.push(`${" ".repeat(gutterWidth)} ... ${end.line - start.line + 1 - shown} more line(s)`);
        }

        return [`${location} - ${error}: ${message}`, "", ...echoed].join("\n");
      },
    );
    if (ordered.length > maxReported) {
      reported.push(`(... and ${ordered.length - maxReported} more)`);
    }

    return [
      `[WARNING] TypeScript found ${ordered.length} problem(s) in the new ${this.subject}. The change WAS applied.`,
      ...reported,
    ].join("\n\n");
  }

  /** Typechecks a snippet against the declarations scanned out of the app, as text for a response. */
  typecheck(code: string) {
    const { typescript } = this.backendResources;

    const { annotated, toAuthorSpan = (span) => span, problems = [] } = this.annotate(code);

    /**
     * What the compiler finds wrong with a snippet, on the author's own lines.
     *
     * The snippet is compiled as a *script* rather than a module: that is what the worker runs it as, so
     * the augmented globals are in scope and top-level `await` and `return` are errors exactly as they
     * are at runtime.
     *
     * A scope that annotates the code before compiling it passes the annotated text as `compiled` and
     * its own `toAuthorSpan`, so every reported line stays the author's.
     */
    const compilerProblems = this.getDiagnostics(annotated)
      .filter(
        (diagnostic): diagnostic is ts.DiagnosticWithLocation =>
          diagnostic.category === typescript.DiagnosticCategory.Error &&
          diagnostic.file?.fileName === SnippetTypescript.snippetFileName,
      )
      .map(
        // One diagnostic located in the snippet, as a problem spanning the author's own source.
        ({ file, start, length, messageText, code }): SnippetProblem => ({
          ...toAuthorSpan({
            start: file.getLineAndCharacterOfPosition(start),
            end: file.getLineAndCharacterOfPosition(start + length),
          }),
          message: typescript.flattenDiagnosticMessageText(messageText, " "),
          code,
        }),
      );

    return this.formatProblems([...problems, ...compilerProblems], code);
  }

  protected annotate(code: string): SnippetTypescriptAnnotatorResult {
    return { annotated: code };
  }
}
