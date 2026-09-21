#!/usr/bin/env node
/**
 * Prints the top-level keys of the custom-constraint initialization code editor's completion
 * scope object for a given SudokuMaker tab - the same object source #3 of the CodeMirror
 * `autocomplete` language data resolves property completions against.
 */
import { writeFile } from "node:fs/promises";
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
  ObjectsIndex,
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
      console.log("Initializing...");

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

      console.log("Scanning the types in the browser...");
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

      let classesCode =
        "/* eslint-disable @typescript-eslint/no-unused-expressions,@typescript-eslint/no-unused-vars,no-undef */\n" +
        "// noinspection JSUnusedGlobalSymbols,CommaExpressionJS,JSUnresolvedReference,JSValidateTypes\n\n";
      for (const [id, object] of Object.entries(objectsIndex)) {
        if (object.type === "class" && object.code !== "class {}") {
          classesCode += `// ${id}:\n${object.code}\n\n`;
        }
      }

      console.log("Enriching the results in Node...");
      const enrichedObjectsIndex = new SmCodeEnricher(objectsIndex, new Set(roots)).process();

      console.log("Processing the results...");
      const getFunctionsMap = <ResultT>(
        objectsIndex: ObjectsIndex<false>,
        mapper: (id: string, name: string, value: IndexFunction) => ResultT,
      ): Record<string, Record<string, ResultT>> =>
        Object.fromEntries(
          Object.entries(objectsIndex)
            .map(([id, obj]): [string, Record<string, ResultT>] => [
              id,
              Object.fromEntries(
                [
                  ...("ownProperties" in obj ? Object.entries(obj.ownProperties ?? {}) : []),
                  ...("static" in obj ? Object.entries(obj.static ?? {}) : []),
                ]
                  .filter((pair): pair is [string, IndexFunction] => pair[1].type === "function")
                  .map(([name, value]) => [name, mapper(id, name, value)]),
              ),
            ])
            .filter(([, value]) => Object.keys(value).length),
        );

      const functionsCode = getFunctionsMap(objectsIndex, (_id, _name, { code }) => code);

      const functionsMap = getFunctionsMap(
        enrichedObjectsIndex,
        (id, name, { requiredArgs = 0, optionalArgs = 0, hasRestArg = false, returnType }): FunctionSignatureInfo => {
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

          return existingSignature?.processed ? existingSignature : newSignature;
        },
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

      declarations += "export type PuzzleState = never;\n\n";
      declarations += "export type Vector2 = { x: number; y: number };\n\n";
      declarations += "export type CellId = number;\n";
      declarations += "export type CornerId = number;\n";
      declarations += "export type EdgeId = number;\n";
      declarations += "export type OuterCellId = number;\n";
      declarations += "export type Digit = number;\n";
      declarations += "export type DigitSetMask = number;\n\n";
      declarations += 'export type Change = { readonly __brand: "Change" };\n\n';

      /** A constraint the solver can hold - one of the standard components, or a custom one. */
      declarations += 'export declare class Component {\n  readonly __brand: "Component";\n}\n\n';

      /*
       * The app's own vector class, which a few helpers return in place of a plain `{x, y}`. Every
       * operation mutates the receiver and returns it, so chaining works but sharing one around
       * does not.
       */
      declarations +=
        "export declare class Vector2Class {\n" +
        "  constructor(x?: number, y?: number);\n" +
        "  x: number;\n" +
        "  y: number;\n" +
        "  get magnitude(): number;\n" +
        "  get magnitudeSqr(): number;\n" +
        "  add(vector: Vector2): this;\n" +
        "  addScaled(vector: Vector2, factor: number): this;\n" +
        "  subtract(vector: Vector2): this;\n" +
        "  rotate(angle: number): this;\n" +
        "  scale(factor: number): this;\n" +
        "  normalize(): this;\n" +
        "  copy(vector: Vector2): this;\n" +
        "  static from(vector: Vector2): Vector2Class;\n" +
        "}\n\n";

      /*
       * An undirected graph of cells, used for connectivity questions. Edges are symmetric, and the
       * comparator only decides which way round a pair is reported by `getEdges`.
       */
      declarations +=
        "export declare class CellGraph {\n" +
        "  constructor(lines?: Iterable<CellId[]>, isGreaterThan?: (a: CellId, b: CellId) => boolean);\n" +
        "  addLine(cellIds: CellId[]): this;\n" +
        "  addPoint(cellId: CellId): void;\n" +
        "  addPoints(cellIds: Iterable<CellId>): void;\n" +
        "  addEdge(a: CellId, b: CellId): this;\n" +
        "  removeEdge(a: CellId, b: CellId, dropIsolated?: boolean): this;\n" +
        "  removePoint(cellId: CellId): this;\n" +
        "  hasEdge(a: CellId, b: CellId): boolean;\n" +
        "  hasPoint(cellId: CellId): boolean;\n" +
        "  getPoints(): CellId[];\n" +
        "  getEdges(): Generator<[CellId, CellId], void, undefined>;\n" +
        "  getPointsAdjacentTo(cellId: CellId): Set<CellId>;\n" +
        "  getPointCount(): number;\n" +
        "  isEmpty(): boolean;\n" +
        "  getAllComponents(): Generator<CellGraph, void, undefined>;\n" +
        "  getConnectedPointSets(cellIds?: Iterable<CellId>): Generator<CellId[], void, undefined>;\n" +
        "  getPointsConnectedTo(cellId: CellId): Set<CellId>;\n" +
        "  getComponentContainingPoint(cellId: CellId): CellGraph;\n" +
        "  getComponentsContainingPoints(cellIds: Iterable<CellId>): CellGraph;\n" +
        "  isSimpleLines(): boolean;\n" +
        "  hasCycles(): boolean;\n" +
        "  toArrays(): CellId[][];\n" +
        "  clone(): CellGraph;\n" +
        "}\n\n";

      /*
       * `setParams` exists to hang the component's own members off the instance, which the other
       * hooks read back - so the type has to admit any name. The known fields stay `readonly`:
       * they are the app's, and an assignment to one is a mistake worth reporting.
       */
      declarations +=
        "export type CustomComponentInstance = {\n" +
        '  readonly __brand: "CustomComponent";\n' +
        "  readonly cellIds: CellId[];\n" +
        "  readonly cells: CellId[];\n" +
        "  readonly name: string;\n" +
        "};\n\n";

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

      /*
       * Properties whose name says what kind of number they hold. The scan only sees `number`, and
       * these are the same value under several classes, so they're keyed by name rather than by
       * owner.
       */
      const scalarPropertyTypes: Record<string, string> = {
        allDigitsMask: "DigitSetMask",
        maxDigit: "Digit",
        minDigit: "Digit",
      };

      const formatOwnProperties = (
        props: IndexPropertiesMap<true> | undefined,
        offset: string,
        isStatic = false,
        typePrefix = "",
        className = "",
      ) => {
        let code = "";
        const modifiers = isStatic ? "static " : "";

        for (const [key, val] of Object.entries(props ?? {})) {
          if (val.type === "magic") {
            const valueTypeCode =
              (val.value?.type === "scalar" ? scalarPropertyTypes[key] : undefined) ??
              format(val.value, offset, typePrefix);
            if (val.get) {
              code += `${offset}${modifiers}get ${key}(): ${valueTypeCode};\n`;
            }
            if (val.set) {
              code += `${offset}${modifiers}set ${key}(value: ${valueTypeCode});\n`;
            }
          } else {
            const signature = functionsMap[className]?.[key];
            const valueTypeCode =
              (val.type === "scalar" ? scalarPropertyTypes[key] : undefined) ??
              format(val, offset, typePrefix, signature);
            code += `${offset}${modifiers}${key}: ${valueTypeCode};\n`;
          }
        }

        return code;
      };

      const format = (
        value: IndexValue<true> | undefined,
        offset = "",
        typePrefix = "",
        signature?: FunctionSignatureInfo,
      ): string => {
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
            const returnType =
              (signature?.processed ? signature.returnType : undefined) ??
              value.returnType ??
              (value.isGenerator
                ? value.isAsync
                  ? "AsyncGenerator<any, void, undefined>"
                  : "Generator<any, void, undefined>"
                : value.isAsync
                  ? "Promise<any>"
                  : "any");

            // The source is minified, so the real parameter names are single letters that would
            // tell a reader nothing - they're numbered by position instead.
            const args: string[] = [];
            if (signature?.processed) {
              // A reviewed signature carries a real name and type per argument, so it replaces the counts.
              for (const { name, type, optional, rest } of signature.arguments) {
                args.push(rest ? `...${name}: ${type}` : `${name}${optional ? "?" : ""}: ${type}`);
              }
            } else {
              for (let i = 0; i < (value.requiredArgs ?? 0); i++) {
                args.push(`arg${args.length + 1}: unknown`);
              }
              for (let i = 0; i < (value.optionalArgs ?? 0); i++) {
                args.push(`arg${args.length + 1}?: unknown`);
              }
              if (value.hasRestArg) {
                args.push("...rest: unknown[]");
              }
            }

            const typeArgs = signature?.processed && signature.typeParams ? `<${signature.typeParams.join(", ")}>` : "";

            return `${typeArgs}(${args.join(", ")}) => ${returnType}`;
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

            /*
             * An inlined object still has its own id in the index, and that's what its members'
             * signatures are keyed by - not the name of whatever contains it.
             */
            code += "{\n";
            code += formatOwnProperties(value.ownProperties, `  ${offset}`, false, typePrefix, value.reference.id);
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
          declarations += "  constructor(value?: DigitSetMask | SmallNumberSet);\n";
          declarations += "  mask: DigitSetMask;\n";
          declarations += "  valueOf(): DigitSetMask;\n";
          declarations += "  [Symbol.iterator](): Generator<number, void, undefined>;\n";
        }
        declarations += formatOwnProperties(value.ownProperties, "  ", false, "", name);
        declarations += formatOwnProperties(value.static, "  ", true, "", name);
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
        .map(
          ({ componentName, definition }) =>
            `  class ${componentName} extends ${typesNamespace}.Component {\n    constructor${definition};\n  }\n`,
        )
        .join("");

      console.log("Writing the files...");
      await writeFile("src/generated/standardComponents.json", JSON.stringify(standardComponents, null, 2));

      await writeFile("src/generated/functions.json", JSON.stringify(functionsCode, null, 2));

      await writeFile(
        "utils/scanSmCode/functionSignatures.ts",
        `import type { FunctionSignatureInfo } from "./types";\n\nexport const functionSignatures: Record<string, Record<string, FunctionSignatureInfo>> = ${JSON.stringify(functionsMap, null, 2)}`,
      );

      await writeFile("src/generated/index.json", JSON.stringify(groupedIndex, null, 2));

      await writeFile("src/generated/classes.js", classesCode);

      await writeFile("src/generated/types.d.ts", declarations);

      await writeFile("src/generated/globals.d.ts", formatGlobals(groupedIndex.class[globalScopeHandle].ownProperties));

      await writeFile(
        "src/generated/standardComponentsGlobals.d.ts",
        formatGlobals(
          {},
          `type CellId = ${typesNamespace}.CellId;\ntype DigitSet = ${typesNamespace}.DigitSet;\n\n`,
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
          [
            `interface ${customComponentsListHandle} {}`,
            `type CellId = ${typesNamespace}.CellId;`,
            // Aliases extend their originals to not be replaced in the typecheck reports
            `interface Puzzle extends ${typesNamespace}.CustomComponentPuzzle {}`,
            `interface Instance extends ${typesNamespace}.CustomComponentInstance {}`,
            `interface DynamicInstance extends Instance { [member: string]: any; }`,
            `type Change = ${typesNamespace}.Change;`,
          ].join("\n"),
        ),
      );

      await run("npx", ["prettier", "-w", "src/generated", "utils/scanSmCode/functionSignatures.ts"]);

      console.log("Checking typescript...");
      /*
       * The generated files are excluded from the project's own compilation - they declare the
       * worker's globals, which don't exist here - so check them separately. `skipLibCheck` would
       * skip declaration files entirely, which is all of them, and the worker has no DOM.
       * The two scope files both declare `helpers`, so each is checked against its own program.
       */
      for (const scopeFile of ["initialCodeGlobals", "customComponentGlobals"]) {
        const files = ["types", "globals", "standardComponentsGlobals", scopeFile].map(
          (name) => `src/generated/${name}.d.ts`,
        );

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
