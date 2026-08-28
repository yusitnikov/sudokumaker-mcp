/// <reference types="vitest/config" />
import { defineConfig } from "vite";

/**
 * Kept separate from `vite.config.ts` so that running tests doesn't load the `injected` plugin,
 * which bundles the page runtime in-process on every `injected:` import. Tests exercise plain
 * modules and never need that entry built.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
