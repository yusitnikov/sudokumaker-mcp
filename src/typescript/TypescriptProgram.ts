// Types only - allow passing the library implementation from elsewhere
import type * as ts from "typescript";

/**
 * Wrapper around typescript.Program that guarantees incremental caching of the shared files.
 */
export abstract class TypescriptProgram {
  readonly _host: ts.CompilerHost;
  private _program?: ts.Program;

  private readonly _filesCache: Record<string, FileCache> = {};

  protected constructor(
    readonly _typescript: typeof ts,
    readonly _options: ts.CompilerOptions,
    readonly _fileNames: string[] = [],
    readonly _baseProgram?: ts.Program,
  ) {
    this._host = _typescript.createCompilerHost(_options);
  }

  static root(typescript: typeof ts, options: ts.CompilerOptions): TypescriptProgram {
    return new RootTypescriptProgram(typescript, options);
  }

  withFiles(files: Record<string, string>): TypescriptProgram {
    return new ChildTypescriptProgram(this, files);
  }

  getProgram() {
    if (!this._program) {
      /**
       * IMPORTANT: overriding the host's methods is *intentionally* deferred to here!
       * @see RootTypescriptProgram.constructor
       */

      const libFileName = this._typescript.getDefaultLibFilePath(this._options);
      const libDirectory = libFileName.slice(0, libFileName.lastIndexOf("/"));

      this._host.getSourceFile = (fileName, ...rest) =>
        this._getFileWithCache(fileName).sourceFile.get(fileName, ...rest);
      this._host.fileExists = (fileName) => this._getFileWithCache(fileName).exists.get();
      this._host.readFile = (fileName) => this._getFileWithCache(fileName).contents.get();
      this._host.getDefaultLibFileName = () => libFileName;
      this._host.getDefaultLibLocation = () => libDirectory;
      // The globals files import `./types`, which is virtual - the default resolver only looks on disk,
      // and without this every scanned type silently degrades to `any`.
      this._host.resolveModuleNameLiterals = (literals, containingFile) => {
        const directory = containingFile.slice(0, containingFile.lastIndexOf("/"));

        return literals.map(({ text }) => ({
          resolvedModule: this._getFileWithCache(`${directory}/${text.replace(/^\.\//, "")}.d.ts`).resolvedModule.get(),
        }));
      };

      this._program = this._typescript.createProgram(this._fileNames, this._options, this._host, this._baseProgram);
    }

    return this._program;
  }

  protected abstract _getFile(fileName: string): FileCache;

  _getFileWithCache(fileName: string): FileCache {
    return (this._filesCache[fileName] ??= this._getFile(fileName));
  }
}

class RootTypescriptProgram extends TypescriptProgram {
  private readonly _getSourceFile: ts.CompilerHost["getSourceFile"];

  constructor(typescript: typeof ts, options: ts.CompilerOptions) {
    super(typescript, options);

    // Save the original implementation before `getProgram()` overrides it
    this._getSourceFile = this._host.getSourceFile.bind(this._host);
  }

  protected _getFile(fileName: string): FileCache {
    return {
      sourceFile: new DeferredValue(this._getSourceFile),
      exists: new DeferredValue(() => this._typescript.sys.fileExists(fileName)),
      contents: new DeferredValue(() => this._typescript.sys.readFile(fileName)),
      resolvedModule: DeferredValue.from(undefined),
    };
  }
}

class ChildTypescriptProgram extends TypescriptProgram {
  constructor(
    private readonly _parent: TypescriptProgram,
    private readonly _ownFileContents: Record<string, string>,
  ) {
    super(
      _parent._typescript,
      _parent._options,
      [...new Set([..._parent._fileNames, ...Object.keys(_ownFileContents)])],
      _parent.getProgram(),
    );
  }

  protected _getFile(fileName: string): FileCache {
    const contents = this._ownFileContents[fileName];

    return contents !== undefined
      ? {
          sourceFile: new DeferredValue((_, languageVersion) =>
            this._typescript.createSourceFile(fileName, contents, languageVersion, true),
          ),
          exists: DeferredValue.from(true),
          contents: DeferredValue.from(contents),
          resolvedModule: DeferredValue.from({
            resolvedFileName: fileName,
            extension: this._typescript.Extension.Dts,
          }),
        }
      : this._parent._getFileWithCache(fileName);
  }
}

interface FileCache {
  sourceFile: DeferredValue<ts.SourceFile | undefined, Parameters<ts.CompilerHost["getSourceFile"]>>;
  exists: DeferredValue<boolean>;
  contents: DeferredValue<string | undefined>;
  resolvedModule: DeferredValue<ts.ResolvedModuleFull | undefined>;
}

class DeferredValue<T, ArgsT extends any[] = []> {
  private resolved?: { value: T };

  constructor(private readonly callback: (...args: ArgsT) => T) {}

  get(...args: ArgsT): T {
    this.resolved ??= { value: this.callback(...args) };
    return this.resolved.value;
  }

  static from<T>(value: T) {
    return new DeferredValue(() => value);
  }
}
