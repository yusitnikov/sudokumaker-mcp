import * as typescript from "typescript";
/*
 * The `?raw` suffix makes Vite hand back the file's text instead of its exports. The import
 * resolver strips the suffix and finds the declaration file itself, which of course exports no
 * default - so `import-x/default` reports on a resolution that is right about the file and wrong
 * about what the bundler returns.
 */
/* eslint-disable import-x/default */
import types from "./generated/types.d.ts?raw";
import globals from "./generated/globals.d.ts?raw";
import standardComponentsGlobals from "./generated/standardComponentsGlobals.d.ts?raw";
import initialCodeGlobals from "./generated/initialCodeGlobals.d.ts?raw";
import customComponentGlobals from "./generated/customComponentGlobals.d.ts?raw";
import type { BackendResources } from "./BackendResources";
/* eslint-enable import-x/default */

export const backendResources: BackendResources = {
  typescript,
  declarations: { types, globals, standardComponentsGlobals, initialCodeGlobals, customComponentGlobals },
};
