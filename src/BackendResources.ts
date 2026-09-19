import type * as ts from "typescript";

/**
 * What the backend half of a tool needs, assembled by the server and passed down to every
 * `...OnBackend` method.
 *
 * These arrive as an argument rather than as imports because the page bundle is built from
 * `src/client/`, which includes every tool file: an import of the compiler or of the generated
 * declarations from a tool would inline both into the ~107 KB snippet the browser eval's. Naming
 * only this type costs nothing - `verbatimModuleSyntax` erases the interface and its `import type`.
 */
export interface BackendResources {
  typescript: typeof ts;
  /** The generated declaration files, as source text. */
  declarations: {
    types: string;
    globals: string;
    initialCodeGlobals: string;
    customComponentGlobals: string;
  };
}
