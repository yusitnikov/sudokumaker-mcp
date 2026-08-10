/**
 * `injected:<path>` imports are resolved by the `injected` plugin in vite.config.ts. They yield the
 * bundled source of that entry as a self-contained statement, ready to be eval'd in the page via
 * `execute_js`. The code installs itself on `window`; it is never invoked as an expression.
 */
declare module "injected:*" {
  const code: string;
  export default code;
}
