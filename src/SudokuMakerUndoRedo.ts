// Reads the app's own name for the pending undo/redo action off the toolbar button's tooltip (e.g.
// "Undo: Clear cell"). `window.Api` exposes no undo/redo history (see SudokuMakerApi.ts), so this is
// the only way to get it. `.UndoIcon`/`.RedoIcon` and the `Tooltip` component's `__name` are literal
// source strings, stable across rebuilds - unlike `data-v-xxxxxxxx` scope-id hashes, never match those.
// `#app.__vue_app__._instance` is null in this app; the real mounted root is `._container._vnode.component`.
// The production build strips `setupState`/`exposed`, but declared props (like `Tooltip`'s `text`) work.

// Minimal shape of the Vue internals touched below.
interface VueVNode {
  el?: Node | null;
  component?: VueComponentInstance | null;
  children?: unknown;
}
interface VueComponentInstance {
  type?: { __name?: string; name?: string };
  vnode?: VueVNode;
  subTree?: VueVNode;
  props?: Record<string, unknown>;
}

/**
 * The app's own name for what `undo`/`redo` would do (e.g. "Clear cell"), with the tooltip's
 * "Undo: "/"Redo: " prefix stripped - or `undefined` if the button is disabled, i.e. nothing to
 * undo/redo.
 */
export function readPendingActionLabel(direction: "undo" | "redo"): string | undefined {
  const iconClass = direction === "undo" ? "UndoIcon" : "RedoIcon";
  const prefix = direction === "undo" ? "Undo: " : "Redo: ";
  const button = document.querySelector(`.${iconClass}`)?.closest("button");
  if (!button || (button instanceof HTMLButtonElement && button.disabled)) {
    return undefined;
  }

  const vueApp = (
    document.querySelector("#app") as (Element & { __vue_app__?: { _container?: { _vnode?: VueVNode } } }) | null
  )?.__vue_app__;
  const root = vueApp?._container?._vnode?.component;
  let text: string | undefined;

  function visitVNode(vnode: VueVNode | null | undefined, depth: number): void {
    if (text !== undefined || !vnode || depth > 100) {
      return;
    }
    if (vnode.component) {
      walk(vnode.component, depth + 1);
    }
    if (Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        if (child && typeof child === "object") {
          visitVNode(child as VueVNode, depth);
        }
      }
    }
  }

  function walk(inst: VueComponentInstance | null | undefined, depth: number): void {
    if (text !== undefined || !inst || depth > 100) {
      return;
    }
    const name = inst.type?.__name || inst.type?.name;
    if (name === "Tooltip") {
      // Tooltip's root anchor node is a child of the button it decorates - matches the right instance.
      const el = inst.vnode?.el;
      if (el && el.parentNode === button) {
        const propsText = inst.props?.text;
        text = typeof propsText === "string" ? propsText : undefined;
      }
    }
    if (inst.subTree) {
      visitVNode(inst.subTree, depth);
    }
  }

  walk(root, 0);
  if (text === undefined) {
    throw new Error(
      `Could not determine what "${direction}" would do, even though it's available right now. This is likely a bug in the MCP server, not a problem with your request - report it instead of retrying.`,
    );
  }
  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}
