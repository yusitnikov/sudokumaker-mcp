import { defineConfig, build, type Plugin } from "vite";
import type { OutputChunk, RolldownOutput } from "rolldown";
import { dirname, resolve } from "path";
import { runtimeGlobal } from "./src/client/runtimeGlobal.ts";

/**
 * Code that runs inside the Sudoku Maker page is authored as normal TypeScript under
 * `src/client/`, but has to reach the browser as a string: the only channel into the page is
 * `execute_js`, which evals its `code` argument.
 *
 * This plugin resolves `injected:<path>` imports by bundling that entry in-process and returning
 * the generated code as a string constant, so nothing is written to disk and nothing is read from
 * `dist` at runtime.
 *
 * The emitted code is a self-contained statement that installs itself on `window` — it is eval'd,
 * never invoked, so nothing here unwraps the iife or depends on its export shape.
 */
const injectedPrefix = "injected:";

const injectedPlugin = (): Plugin => {
  /** Bundled code per entry, alongside the module ids it was built from. */
  const cache = new Map<
    string,
    { code: string; moduleIds: readonly string[] }
  >();

  return {
    name: "injected",
    // The path after the prefix is relative to the importer, like any other relative import, so it
    // is resolved here — `load` only ever sees absolute entry paths.
    resolveId: (id, importer) => {
      if (!id.startsWith(injectedPrefix)) {
        return null;
      }

      const entry = resolve(
        importer === undefined ? import.meta.dirname : dirname(importer),
        id.slice(injectedPrefix.length),
      );

      return `\0${injectedPrefix}${entry}`;
    },
    watchChange(id) {
      for (const [entry, { moduleIds }] of cache) {
        if (moduleIds.includes(id)) {
          cache.delete(entry);
        }
      }
    },
    async load(id) {
      if (!id.startsWith(`\0${injectedPrefix}`)) {
        return null;
      }

      // Strip the leading `\0` that marks the id as virtual, then the `injected:` prefix itself.
      const entry = id.slice(1 + injectedPrefix.length);

      let cached = cache.get(entry);
      if (cached === undefined) {
        const result = await build({
          configFile: false,
          logLevel: "silent",
          build: {
            write: false,
            target: "esnext",
            // The snippet crosses the broker on every install: 268 KB -> 107 KB.
            minify: "oxc",
            lib: {
              entry,
              formats: ["iife"],
              // Required by the iife format, but deliberately not `runtimeGlobal`: rollup assigns
              // the exports object to this name, which would clobber the entry's own install.
              // Nothing reads it — the entry installs itself and exports nothing.
              name: "__injectedExports",
              fileName: "injected",
            },
          },
        });

        // build() returns RolldownOutput | RolldownOutput[] | RolldownWatcher; only the first two
        // are possible here, since this is a one-shot build with no watcher.
        const outputs: RolldownOutput[] = Array.isArray(result)
          ? result
          : "output" in result
            ? [result]
            : [];
        const chunks = outputs
          .flatMap(({ output }) => output)
          .filter((item): item is OutputChunk => item.type === "chunk");
        const [chunk] = chunks;
        if (chunk === undefined || chunks.length !== 1) {
          // A split chunk would reference a sibling file that never reaches the page.
          throw new Error(
            `Expected exactly 1 chunk for ${entry}, got ${chunks.length}`,
          );
        }

        // The code is eval'd for its side effect, so an entry that fails to install is a build
        // error: it would bundle cleanly and only throw in the page, on dispatch.
        if (!chunk.code.includes(`window.${runtimeGlobal}=`)) {
          throw new Error(
            `${entry} must assign window.${runtimeGlobal} at top level; the bundle never does. ` +
              `Minification drops the assignment if it looks unreachable.`,
          );
        }

        cached = { code: chunk.code, moduleIds: chunk.moduleIds };
        cache.set(entry, cached);
      }

      // Nested builds are invisible to the outer one, so declare their inputs on every load —
      // `watchChange` above evicts the cache when any of them changes.
      for (const moduleId of cached.moduleIds) {
        this.addWatchFile(moduleId);
      }

      return `export default ${JSON.stringify(cached.code)};`;
    },
  };
};

export default defineConfig({
  plugins: [injectedPlugin()],
  build: {
    ssr: true,
    lib: {
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        "bin/mcp-server": resolve(import.meta.dirname, "bin/mcp-server.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rolldownOptions: {
      external: [
        "@modelcontextprotocol/sdk",
        "@sitnikov/browser-automation",
        "commander",
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
