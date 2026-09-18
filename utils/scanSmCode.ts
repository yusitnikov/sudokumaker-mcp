#!/usr/bin/env node
/**
 * Prints the top-level keys of the custom-constraint initialization code editor's completion
 * scope object for a given SudokuMaker tab - the same object source #3 of the CodeMirror
 * `autocomplete` language data resolves property completions against.
 */
import { writeFile, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import { program } from "commander";
import { ExtensionAutomationClient } from "@sitnikov/browser-automation";
import { GenericSmCodeScanner, SmCodeScanner } from "./scanSmCode/SmCodeScanner";
import { SmCodeEnricher } from "./scanSmCode/SmCodeEnricher";
import { SmCodeValueResolver } from "./scanSmCode/SmCodeValueResolver";
import type {
  ArgumentDraftInfo,
  FunctionSignatureInfo,
  IndexFunction,
  IndexPropertiesMap,
  IndexReferencable,
  IndexValue,
} from "./scanSmCode/types";
import { functionSignatures } from "./scanSmCode/functionSignatures";

/** Runs a command, passing its output straight through, and exits if it fails. */
const run = (command: string, args: string[]) =>
  new Promise<void>((resolve) => {
    spawn(command, args, { stdio: "inherit" }).on("close", (code) => {
      if (code) {
        process.exit(code);
      }
      resolve();
    });
  });

program
  .name("scan-sm-code")
  .description(
    "Print the top-level keys of the custom constraint code editor's completion scope for a SudokuMaker tab.",
  )
  .argument("[sessionToken]", "Session token from an already-approved initiate_session call")
  .argument("[extensionConnectionId]", "Extension connection ID from the same initiate_session call")
  .argument("[tabId]", "Chrome tab ID of the SudokuMaker tab to inspect", (value) => Number(value))
  .action(
    async (
      sessionTokenArg: string | undefined,
      extensionConnectionIdArg: string | undefined,
      tabId: number | undefined,
    ) => {
      const client = new ExtensionAutomationClient("ws://localhost:3004");

      let sessionToken = "";
      let extensionConnectionId = "";
      const listTabs = () => client.listTabs(sessionToken, extensionConnectionId);
      let tabs: Awaited<ReturnType<typeof listTabs>> | undefined;
      let isStaleSession = false;
      const formatCommand = (tabId: string | number) =>
        `  npm run scan-sm-code -- ${sessionToken} ${extensionConnectionId} ${tabId}`;
      const startNewSession = async () => {
        const session = await client.initiateSession("scan-sm-code", ["sudokumaker.app"]);
        if (!session.approved) {
          console.error("Session was rejected.");
          process.exit(1);
        }
        ({ sessionToken, extensionConnectionId } = session);
        console.log(`sessionToken: ${sessionToken}`);
        console.log(`extensionConnectionId: ${extensionConnectionId}`);
      };
      if (sessionTokenArg === undefined || extensionConnectionIdArg === undefined) {
        await startNewSession();
      } else {
        sessionToken = sessionTokenArg;
        extensionConnectionId = extensionConnectionIdArg;
        try {
          tabs = await listTabs();
        } catch {
          isStaleSession = true;
          await startNewSession();
        }
      }

      tabs ??= await listTabs();

      if (tabId === undefined || !tabs.find((tab) => String(tab.id) === String(tabId))) {
        console.log("To scan a tab, run:");
        console.log(formatCommand("<tabId>"));
        console.log("using one of these tab IDs:");
        for (const tab of tabs) {
          console.log(`- ID: ${tab.id}. Title: "${tab.title}"`);
        }
        return;
      }

      if (isStaleSession) {
        console.log("Generated new session. New command:");
        console.log(formatCommand(tabId));
      }

      const response = await client.executeJs(
        sessionToken,
        extensionConnectionId,
        tabId,
        // language=javascript
        `(() => {
          ${GenericSmCodeScanner.toString()}
          ${SmCodeScanner.toString()}
          return new SmCodeScanner().processOnMainThread();
        })()`,
      );
      if (!response.success) {
        console.error("Error:", response);
        process.exit(1);
      }
      const { standardComponents, objectsIndex, roots }: Awaited<ReturnType<SmCodeScanner["processOnMainThread"]>> =
        JSON.parse(response.result);

      const header = "// noinspection JSUnusedGlobalSymbols\n\n";

      let classesCode = header;
      for (const [id, object] of Object.entries(objectsIndex)) {
        if (object.type === "class") {
          classesCode += `const ${id} = ${object.code}\n\n`;
        }
      }

      const enrichedObjectsIndex = new SmCodeEnricher(objectsIndex, new Set(roots)).process();

      const functionsMap = Object.fromEntries(
        Object.entries(enrichedObjectsIndex)
          .map(([id, obj]) => [
            id,
            Object.fromEntries(
              [
                ...("ownProperties" in obj ? Object.entries(obj.ownProperties ?? {}) : []),
                ...("static" in obj ? Object.entries(obj.static ?? {}) : []),
              ]
                .filter((pair): pair is [string, IndexFunction] => pair[1].type === "function")
                .map(
                  ([name, { requiredArgs = 0, optionalArgs = 0, hasRestArg = false, returnType }]): [
                    string,
                    FunctionSignatureInfo,
                  ] => {
                    const existingSignature = functionSignatures[id]?.[name];
                    const newSignature: FunctionSignatureInfo = {
                      processed: false,
                      arguments: [
                        ...Array(requiredArgs)
                          .fill(0)
                          .map((): ArgumentDraftInfo => ({})),
                        ...Array(optionalArgs)
                          .fill(0)
                          .map((): ArgumentDraftInfo => ({ optional: true })),
                        ...(hasRestArg ? [{ rest: true } satisfies ArgumentDraftInfo] : []),
                      ],
                      returnType,
                    };

                    return [name, existingSignature?.processed ? existingSignature : newSignature];
                  },
                ),
            ),
          ])
          .filter(([, value]) => Object.keys(value).length),
      );

      const mappedObjectsIndex = new SmCodeValueResolver(enrichedObjectsIndex, new Set(roots)).process();

      const groupedIndex: {
        [T in IndexReferencable<true>["type"]]: Record<string, Extract<IndexReferencable<true>, { type: T }>>;
      } = {
        object: {},
        class: {},
        numericEnum: {},
        internal: {},
      };
      for (const [id, object] of Object.entries(mappedObjectsIndex)) {
        const { type } = object;
        groupedIndex[type][id] = object;
      }

      let declarations = header;

      const { initialCodeScopeHandle, customComponentCodeScopeHandle, globalScopeHandle } = SmCodeScanner;
      const typesNamespace = "types";
      // The two scopes and their shared base become global bindings (see below), not types.
      const scopeHandles = [initialCodeScopeHandle, customComponentCodeScopeHandle, globalScopeHandle];

      const resolveInstanceOf = (id: string): string => {
        const object = mappedObjectsIndex[id];
        if (object.type === "object" && !object.ownProperties && object.class?.type === "reference") {
          return object.class.id;
        }
        return id;
      };

      const formatOwnProperties = (
        props: IndexPropertiesMap<true> | undefined,
        offset: string,
        isStatic = false,
        typePrefix = "",
      ) => {
        let code = "";
        const modifiers = isStatic ? "static " : "";

        for (const [key, val] of Object.entries(props ?? {})) {
          if (val.type === "magic") {
            const valueTypeCode = format(val.value, offset, typePrefix);
            if (val.get) {
              code += `${offset}${modifiers}get ${key}(): ${valueTypeCode};\n`;
            }
            if (val.set) {
              code += `${offset}${modifiers}set ${key}(value: ${valueTypeCode});\n`;
            }
          } else {
            code += `${offset}${modifiers}${key}: ${format(val, offset, typePrefix)};\n`;
          }
        }

        return code;
      };

      const format = (value: IndexValue<true> | undefined, offset = "", typePrefix = ""): string => {
        if (value === undefined) {
          return "unknown";
        }

        switch (value.type) {
          case "reference":
            return (
              (["class", "numericEnum"].includes(mappedObjectsIndex[value.id].type) ? "typeof " : "") +
              typePrefix +
              resolveInstanceOf(value.id)
            );
          case "internal":
            return "never";
          case "scalar":
            return value.value === null ? "null" : typeof value.value;
          case "array":
            return `(${format(value.item, offset, typePrefix)})[]`;
          case "set":
            return `Set<${format(value.item, offset, typePrefix)}>`;
          case "map":
            return `Map<${format(value.entry?.[0], offset, typePrefix)}, ${format(value.entry?.[1], offset, typePrefix)}>`;
          case "function": {
            // They stay `unknown` until then - anything is assignable to `unknown`, so only the count is enforced.
            let returnType =
              value.returnType ??
              (value.isGenerator
                ? value.isAsync
                  ? "AsyncGenerator<any, void, undefined>"
                  : "Generator<any, void, undefined>"
                : value.isAsync
                  ? "Promise<any>"
                  : "any");

            if (value.isGenerator) {
              returnType = returnType.replace(/,\s*(any|unknown)>$/, ", undefined>");
            }

            // The source is minified, so the real parameter names are single letters that would
            // tell a reader nothing - they're numbered by position instead.
            const args: string[] = [];
            for (let i = 0; i < (value.requiredArgs ?? 0); i++) {
              args.push(`arg${args.length + 1}: unknown`);
            }
            for (let i = 0; i < (value.optionalArgs ?? 0); i++) {
              args.push(`arg${args.length + 1}?: unknown`);
            }
            if (value.hasRestArg) {
              args.push("...rest: unknown[]");
            }

            return `(${args.join(", ")}) => ${returnType}`;
          }
          case "object": {
            let code = "";

            if (value.class) {
              if (value.class.type !== "reference") {
                throw new Error("Not implemented - non-class extends");
              }
              code += typePrefix + value.class.id;
              if (!value.ownProperties) {
                return code;
              }
              code += ` & `;
            }

            code += "{\n";
            code += formatOwnProperties(value.ownProperties, `  ${offset}`, false, typePrefix);
            code += `${offset}}`;

            return code;
          }
          default:
            throw new Error(`Not expected - type = ${value.type}`);
        }
      };

      for (const [name, value] of Object.entries(groupedIndex.class)) {
        if (scopeHandles.includes(name)) {
          continue;
        }
        declarations += `export declare class ${name}`;
        if (value.extends) {
          if (value.extends.type !== "reference") {
            throw new Error("Not implemented - non-class extends");
          }
          declarations += ` extends ${value.extends.id}`;
        }
        declarations += " {\n";
        if (name === "SmallNumberSet") {
          declarations += "  constructor(value?: number | SmallNumberSet);\n";
          declarations += "  mask: number;\n";
          declarations += "  valueOf(): number;\n";
          declarations += "  [Symbol.iterator](): Generator<number, void, undefined>;\n";
        }
        declarations += formatOwnProperties(value.ownProperties, "  ");
        declarations += formatOwnProperties(value.static, "  ", true);
        declarations += "}\n\n";
      }

      for (const [name, value] of Object.entries(groupedIndex.object)) {
        if (scopeHandles.includes(name)) {
          continue;
        }
        if (!roots.includes(name) && resolveInstanceOf(name) !== name) {
          continue;
        }
        declarations += `export type ${name} = ${format(value)};\n\n`;
      }

      for (const [name, value] of Object.entries(groupedIndex.numericEnum)) {
        declarations += `export declare enum ${name} {\n`;
        for (const [key, val] of Object.entries(value.values)) {
          declarations += `  ${key} = ${val},\n`;
        }
        declarations += "}\n\n";
      }

      for (const name of Object.keys(groupedIndex.internal)) {
        declarations += `export type ${name} = never;\n\n`;
      }

      const customComponentsListHandle = "CustomComponents";

      const formatGlobals = (props: IndexPropertiesMap<true> | undefined, extraTypes = "", extraDeclarations = "") => {
        let bindings = "";

        for (const [key, val] of Object.entries(props ?? {})) {
          if (val.type === "magic") {
            throw new Error(`Not expected - a getter/setter (${key}) on a scope object`);
          }
          bindings += `  const ${key}: ${key === "customComponents" ? customComponentsListHandle : format(val, "  ", `${typesNamespace}.`)};\n`;
        }

        return `${header}import type * as ${typesNamespace} from "./types";\n\n${extraTypes}declare global {\n${bindings}${extraDeclarations}}\n`;
      };

      /*
       * The standard components are constructed by name in the snippets, but the scanner excludes
       * them from the index (see `ignoredHandles`), so they're declared from the UI's own catalog.
       * Only the constructor signature matters - nothing reads an instance's members.
       */
      const componentDeclarations = standardComponents
        .flatMap(({ name, aliases, definition }) =>
          [name, ...aliases].map((componentName) => ({ componentName, definition })),
        )
        .sort((a, b) => a.componentName.localeCompare(b.componentName))
        .map(({ componentName, definition }) => `  class ${componentName} {\n    constructor${definition};\n  }\n`)
        .join("");

      await writeFile("src/generated/standardComponents.json", JSON.stringify(standardComponents, null, 2));

      await writeFile(
        "utils/scanSmCode/functionSignatures.ts",
        `import type { FunctionSignatureInfo } from "./types";\n\nexport const functionSignatures: Record<string, Record<string, FunctionSignatureInfo>> = ${JSON.stringify(functionsMap, null, 2)}`,
      );

      await writeFile("src/generated/index.json", JSON.stringify(groupedIndex, null, 2));

      // Write as ".ts" initially for the prettification to kick in, then rename to ".txt" to disable false linting
      await writeFile("src/generated/classes.ts", classesCode);

      await writeFile("src/generated/types.d.ts", declarations);

      await writeFile(
        "src/generated/globals.d.ts",
        formatGlobals(
          groupedIndex.class[globalScopeHandle].ownProperties,
          `type CellId = number;\ntype DigitSet = ${typesNamespace}.DigitSet;\n\n`,
          componentDeclarations,
        ),
      );

      await writeFile(
        "src/generated/initialCodeGlobals.d.ts",
        formatGlobals(groupedIndex.object[initialCodeScopeHandle].ownProperties),
      );

      await writeFile(
        "src/generated/customComponentGlobals.d.ts",
        formatGlobals(
          groupedIndex.object[customComponentCodeScopeHandle].ownProperties,
          "",
          `interface ${customComponentsListHandle} {}\n`,
        ),
      );

      await run("npx", ["prettier", "-w", "src/generated", "utils/scanSmCode/functionSignatures.ts"]);

      await rename("src/generated/classes.ts", "src/generated/classes.ts.txt");

      /*
       * The generated files are excluded from the project's own compilation - they declare the
       * worker's globals, which don't exist here - so check them separately. `skipLibCheck` would
       * skip declaration files entirely, which is all of them, and the worker has no DOM.
       * The two scope files both declare `helpers`, so each is checked against its own program.
       */
      for (const scopeFile of ["initialCodeGlobals", "customComponentGlobals"]) {
        const files = ["types", "globals", scopeFile].map((name) => `src/generated/${name}.d.ts`);

        await run("npx", [
          "tsc",
          "--noEmit",
          "--ignoreConfig",
          "--skipLibCheck",
          "false",
          "--target",
          "esnext",
          "--lib",
          "esnext",
          ...files,
        ]);
      }

      console.log("");
      console.log("Done!");
    },
  );

program.parse();
