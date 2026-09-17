/**
 * `injected:<path>` imports are resolved by the `injected` plugin in vite.config.ts. They yield the
 * bundled source of that entry as a self-contained statement, ready to be eval'd in the page via
 * `execute_js`. The code installs itself on `window`; it is never invoked as an expression.
 */
declare module "injected:*" {
  const code: string;
  export default code;
}

/**
 * Vite's built-in `?raw` suffix yields a file's contents as a string. Declared here because the
 * project's `types` lists only `node`, so `vite/client`'s own declaration is not in scope.
 */
declare module "*?raw" {
  const contents: string;
  export default contents;
}
