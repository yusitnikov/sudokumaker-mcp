import type {
  IndexClass,
  IndexInternal,
  IndexNumericEnum,
  IndexObject,
  IndexPropertiesMap,
  IndexReferencable,
  IndexReference,
  IndexReferenceById,
  IndexValue,
  ObjectsIndex,
} from "./types";

/*
 * WARNING: The contents of this file are passed to the frontend as a code string!
 *          The file cannot be split into other files, and it cannot import anything other than types.
 *          Adding anything non-type outside the existing 2 classes will lead to reference errors.
 */

type AnyObject = Record<string, any>;

type PrototypeOptions = { isClassPrototype: true } | { object: AnyObject };

export class GenericSmCodeScanner<IsValue extends boolean> {
  constructor(
    protected readonly objectsIndex: ObjectsIndex<IsValue> = {},
    protected readonly roots = new Set<string>(),
  ) {}

  protected sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  protected async waitFor<T>(callback: () => T | Promise<T>) {
    const timeout = Date.now() + 1000;
    while (Date.now() < timeout) {
      const result = await callback();
      if (result) {
        return result as Exclude<T, null | undefined | false | 0 | "">;
      }
      await this.sleep(100);
    }
    throw new Error("Operation timed out");
  }

  protected resolveReference<T extends IndexReferencable<IsValue>>(reference: IndexReference<IsValue, T>): T {
    return reference.type !== "reference" ? (reference as T) : (this.objectsIndex[reference.id] as T);
  }

  protected isReference<T extends IndexReferencable<IsValue>["type"]>(
    reference: IndexValue<IsValue>,
    type: T,
  ): reference is IndexReference<IsValue, Extract<IndexReferencable<IsValue>, { type: T }>> {
    return reference.type === "reference" && this.resolveReference(reference).type === type;
  }

  protected getClass(value: unknown) {
    return Object.getPrototypeOf(value)?.constructor;
  }

  protected getRealClass(value: unknown) {
    const result = this.getClass(value);
    return result === Object ? undefined : result;
  }

  protected isClass<T>(value: unknown, classRef: new (...args: any) => T): value is T {
    return this.getClass(value) === classRef;
  }
}

export class SmCodeScanner extends GenericSmCodeScanner<false> {
  /** Name of the BroadcastChannel that carries the worker's report back to the page. */
  private static readonly channelName = "smCodeScanner";

  static readonly initialCodeScopeHandle = "InitialCodeScope";
  static readonly customComponentCodeScopeHandle = "CustomComponentScope";
  static readonly globalScopeHandle = "GlobalScope";

  private autoIncrementId = 0;
  private readonly objectsMap = new Map<any, IndexReference<false, IndexReferencable<false>>>();

  // Expect these handles to be present, but exclude them from the index.
  private ignoredHandles = new Set<string>();

  private ignoreComponentHandles(standardComponentNames: string[], customComponentCodeScope: any) {
    const customComponentNames = Object.keys(customComponentCodeScope.customComponents);

    // Expect these handles to be present, but exclude them from the index.
    this.ignoredHandles = new Set([
      ...[...standardComponentNames, ...customComponentNames].map(
        (name) => `${SmCodeScanner.initialCodeScopeHandle}.${name}`,
      ),
      ...standardComponentNames.map((name) => `${SmCodeScanner.customComponentCodeScopeHandle}.${name}`),
      ...customComponentNames.map((name) => `${SmCodeScanner.customComponentCodeScopeHandle}.customComponents.${name}`),
    ]);
  }

  // WARNING: definitionDraft must be constructed BEFORE processing the actual value - the caller has to register the reference ASAP
  private registerObject(reference: IndexReferenceById, definitionDraft: IndexReferencable<false>) {
    this.objectsIndex[reference.id] = definitionDraft;
  }

  private registerReference(value: unknown, handle: string, isRoot = false) {
    const reference: IndexReferenceById = {
      type: "reference",
      id: isRoot ? handle : `#${String(++this.autoIncrementId).padStart(3, "0")}`,
    };
    this.objectsMap.set(value, reference);
    return reference;
  }

  private indexObjectOwnProperties(
    value: AnyObject,
    handle: string,
    prototypeOptions?: PrototypeOptions,
    ignoredProps: string[] = [],
  ) {
    // Methods and getters defined via class syntax are non-enumerable, so Object.keys() alone
    // (own enumerable properties) misses them - getOwnPropertyNames() sees them too.
    const ownProperties: IndexPropertiesMap<false> = {};
    const prototype = Object.getPrototypeOf(value);
    for (const key of Object.getOwnPropertyNames(value).toSorted()) {
      if (ignoredProps.includes(key)) {
        continue;
      }
      if (prototypeOptions && key === "constructor") {
        continue;
      }
      const childHandle = `${handle}.${key}`;
      if (this.ignoredHandles.has(childHandle)) {
        this.ignoredHandles.delete(childHandle);
        continue;
      }
      if (key in prototype) {
        console.debug("Ignored", key, "on", value, "because of having it on the prototype");
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      ownProperties[key] =
        descriptor?.get || descriptor?.set
          ? {
              type: "magic",
              get: descriptor.get?.toString(),
              set: descriptor.set?.toString(),
              value:
                descriptor.get && !(prototypeOptions && "isClassPrototype" in prototypeOptions)
                  ? this.indexValue((prototypeOptions?.object ?? value)[key], `${childHandle}.value`)
                  : undefined,
            }
          : this.indexValue(value[key], childHandle);
    }
    return Object.keys(ownProperties).length ? ownProperties : undefined;
  }

  private indexObject(
    definition: IndexObject<false> | IndexClass<false>,
    value: AnyObject,
    handle: string,
    prototypeOptions?: PrototypeOptions,
  ) {
    definition.ownProperties = this.indexObjectOwnProperties(value, handle, prototypeOptions);

    // Methods defined on a class (not plain own data properties) live on the prototype, not on
    // the instance itself - index it explicitly so those aren't missed.
    const objectClass = this.getRealClass(value);
    if (objectClass) {
      const indexedPrototype = this.indexValue(
        objectClass,
        `${handle}.${definition.type === "class" ? "extends" : "class"}`,
        prototypeOptions ?? { object: value },
      );
      if (!this.isReference(indexedPrototype, "class") && indexedPrototype.type !== "function") {
        console.log(value, indexedPrototype);
        throw new Error(`${handle} prototype is not a class - see the value is the browser's console`);
      }
      if (definition.type === "class") {
        definition.extends = indexedPrototype;
      } else {
        definition.class = indexedPrototype;
      }
    }
  }

  private indexValue(
    value: unknown,
    handle: string,
    prototypeOptions?: PrototypeOptions,
    isRoot = false,
  ): IndexValue<false> {
    if (value === null || ["undefined", "number", "string", "boolean", "bigint"].includes(typeof value)) {
      return { type: "scalar", value };
    }

    if (Array.isArray(value)) {
      return { type: "array", item: value.length ? this.indexValue(value[0], `${handle}[0]`) : undefined };
    }

    if (this.isClass(value, Set)) {
      return { type: "set", item: value.size ? this.indexValue([...value][0], `${handle}[0]`) : undefined };
    }

    if (this.isClass(value, Map)) {
      const entry = [...value][0];
      return {
        type: "map",
        entry: value.size
          ? [this.indexValue(entry[0], `${handle}.key`), this.indexValue(entry[1], `${handle}.value`)]
          : undefined,
      };
    }

    const existingReference = this.objectsMap.get(value);
    if (existingReference) {
      const object = this.objectsIndex[existingReference.id];
      if (isRoot && existingReference.id !== handle) {
        if (!existingReference.id.startsWith("#")) {
          throw new Error(`Trying to rename a named reference from ${existingReference.id} to ${handle}`);
        }
        delete this.objectsIndex[existingReference.id];
        existingReference.id = handle;
        this.objectsIndex[handle] = object;
      }
      object.references.push(handle);
      return existingReference;
    }

    if (typeof value === "object") {
      const values = Object.values(value);
      const numericValues = values.filter((v) => typeof v === "number");
      const getItem = (key: string | number) => (value as AnyObject)[String(key)];
      const isEnum =
        !this.getRealClass(value) &&
        values.length !== 0 &&
        numericValues.length * 2 === values.length &&
        new Set(values).size === values.length &&
        numericValues.every((numKey) => {
          const strKey = getItem(numKey);
          return typeof strKey === "string" && getItem(strKey) === numKey;
        });
      const reference = this.registerReference(value, handle, isRoot);
      const definition: IndexObject<false> | IndexNumericEnum = isEnum
        ? { type: "numericEnum", reference, references: [handle], values: {} }
        : { type: "object", reference, references: [handle] };
      this.registerObject(reference, definition);
      if (definition.type === "object") {
        this.indexObject(definition, value, handle, prototypeOptions);
      } else {
        definition.values = Object.fromEntries(
          numericValues.toSorted((a, b) => a - b).map((v) => [String(getItem(v)), v]),
        );
      }
      return reference;
    }

    if (typeof value === "function") {
      const code = value.toString();
      if (!/^\s*class\s/.test(code)) {
        return { type: "function", code };
      }

      const reference = this.registerReference(value, handle, isRoot);
      const definition: IndexClass<false> = { type: "class", reference, references: [handle] };
      this.registerObject(reference, definition);
      this.indexObject(definition, value.prototype, handle, prototypeOptions ?? { isClassPrototype: true });
      definition.static = this.indexObjectOwnProperties(value, handle, { object: value }, [
        "name",
        "length",
        "prototype",
      ]);
      return reference;
    }

    console.error("Unexpected value type:", value);
    throw new Error(`Unexpected value type "${typeof value}" - look in the browser console to see the value`);
  }

  private indexLabel(value: unknown, handle: string) {
    return this.indexValue(value, handle, undefined, true);
  }

  private indexRoot(value: unknown, handle: string) {
    this.roots.add(handle);
    return this.indexLabel(value, handle);
  }

  private fakeBaseClass(name: string, ...refs: IndexValue<false>[]) {
    const fakeClassRef = this.indexLabel(class {}, name) as IndexReference<false, IndexClass<false>>;
    const fakeClassObj = this.resolveReference(fakeClassRef);
    for (const ref of refs) {
      if (ref.type !== "reference") {
        continue;
      }
      const obj = this.resolveReference(ref);
      if (obj.type === "object" && !obj.class) {
        obj.class = fakeClassRef;
        fakeClassObj.references.push(`${ref.id}.class`);
      }
    }
  }

  private markAsInternal(value: unknown, handle: string) {
    const reference = this.registerReference(value, handle, true);
    const definition: IndexInternal = { type: "internal", reference, references: [handle] };
    this.registerObject(reference, definition);
    return reference;
  }

  private finalizeIndexing() {
    if (this.ignoredHandles.size > 0) {
      throw new Error(
        `Expected these handles to be excluded from the index, but they were never encountered: ${Array.from(this.ignoredHandles).join(", ")}`,
      );
    }

    return {
      objectsIndex: Object.fromEntries(
        Object.entries(this.objectsIndex).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)),
      ),
      roots: [...this.roots],
    };
  }

  private scanStandardComponentsList(modal: Element) {
    // Renders a DOM node's contents as an inline Markdown-ish string: <strong> -> **bold**,
    // <code> -> `code`, <em> -> *em*, &nbsp; -> space, everything else -> plain text.
    function toMarkdown(node: Element) {
      let out = "";
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          out += (child.textContent ?? "").replace(/\u00a0/g, " ");
        } else if (child instanceof Element) {
          if (child.tagName === "STRONG") {
            out += `**${toMarkdown(child)}**`;
          } else if (child.tagName === "CODE") {
            out += `\`${toMarkdown(child)}\``;
          } else if (child.tagName === "EM") {
            out += `*${toMarkdown(child)}*`;
          } else if (child.tagName === "DIV") {
            // Block-level siblings (e.g. the "Aliases: ..." line) render on their own line.
            out += "\n" + toMarkdown(child).trim();
          } else {
            out += toMarkdown(child);
          }
        }
      }
      return out;
    }

    function plainText(node: Element) {
      return node.textContent.replace(/\u00a0/g, " ").trim();
    }

    const componentSections = modal.querySelectorAll("section.components");
    if (componentSections.length === 0) {
      throw new Error('No "section.components" found in the custom constraint modal.');
    }
    const standardComponentsSection = componentSections[componentSections.length - 1];
    return Array.from(standardComponentsSection.querySelectorAll(".ConstraintComponentEntry"), (entry) => {
      const definitionEl = entry.querySelector(".definition")!;
      const descriptionEl = entry.querySelector(".description")!;
      const name = plainText(definitionEl.querySelector("strong")!);

      const aliasesEl = entry.querySelector(".aliases");
      const aliases = aliasesEl ? Array.from(aliasesEl.querySelectorAll("strong"), plainText) : [];

      const definition = plainText(definitionEl).trim();
      if (!definition.startsWith(`${name}(`)) {
        throw new Error(`Definition "${definition}" doesn't start with the component name "${name}"`);
      }
      const description = toMarkdown(descriptionEl).trim();

      return {
        name,
        aliases,
        definition: definition.substring(name.length),
        description,
      };
    });
  }

  private installCustomElement(initializationCode = "", customComponentCode = "") {
    return window.Api.updatePuzzle((puzzle) => {
      puzzle.allConstraints = [
        {
          id: 1,
          enabled: true,
          solverIgnored: false,
          config: {
            type: window.Api.PuzzleElementType.Custom,
            definition: {
              name: "Code Scanner",
              input: [{ id: "groups", label: "Groups", params: { type: "raw" } }],
              backend: {
                type: "code",
                code: initializationCode,
              },
              components: [
                {
                  type: "code",
                  name: "DebuggerComponent",
                  code: customComponentCode,
                },
              ],
            },
            input: { groups: [{ cells: [42], value: "val" }] },
            style: {},
          },
        },
      ];
    });
  }

  private getAllActionButtons() {
    return document.querySelectorAll<HTMLButtonElement>(".constraintsWrapper button.ConstraintActions");
  }

  private async openCustomEditorModal() {
    const actionsButton = await this.waitFor(() => {
      const buttons = this.getAllActionButtons();
      return buttons.length === 1 ? buttons[0] : undefined;
    });
    actionsButton.click();

    const menuItem = await this.waitFor(() =>
      document.querySelector<HTMLButtonElement>(".Dropdown button.DropdownItem:has(.Icon.Wrench)"),
    );
    menuItem.click();

    return await this.waitFor(() => document.querySelector(".CustomConstraintModal"));
  }

  private async closeCustomEditorModal(modal: Element) {
    const cancelButton = await this.waitFor(() =>
      [...modal.querySelectorAll<HTMLButtonElement>(".footer button.FormButton")].find(
        (el) => el.textContent.trim() === "Cancel",
      ),
    );
    cancelButton.click();
  }

  async processOnMainThread() {
    // The constraint code runs in a worker that the page has no handle to, so the only way back is
    // a channel addressed by name. Arm it before the worker exists, or its message is missed.
    const channel = new BroadcastChannel(SmCodeScanner.channelName);
    let workerResult: ReturnType<SmCodeScanner["finalizeIndexing"]> | undefined = undefined;
    channel.onmessage = ({ data }) => {
      workerResult = data;
    };

    // Clean up the puzzle
    window.Api.updatePuzzle((puzzle) => {
      puzzle.allConstraints = [];
    });
    await this.waitFor(() => !this.getAllActionButtons().length);

    // Install empty custom element to be able to open the editor modal
    this.installCustomElement();

    const modal = await this.openCustomEditorModal();

    const standardComponents = this.scanStandardComponentsList(modal);
    const standardComponentNames = standardComponents.flatMap((component) => [component.name, ...component.aliases]);

    await this.closeCustomEditorModal(modal);

    // Install the custom element with the scanner code
    this.installCustomElement(
      // language=javascript
      `
        globalThis.initialCodeArgs = arguments;
        // noinspection JSUnresolvedReference
        puzzle.addConstraintComponent(new DebuggerComponent('DebuggerName'));
        ${GenericSmCodeScanner.toString()}
        ${SmCodeScanner.toString()}
        void new SmCodeScanner().processOnWorkerThread(globalThis, ${JSON.stringify(standardComponentNames)});
      `,
      // language=javascript
      `
        globalThis.customCodeArgs = arguments;
        // noinspection JSUnusedLocalSymbols
        function getAffectedCells() {
          globalThis.getAffectedCellsArgs = arguments;
          return [23];
        }
        // noinspection JSUnusedLocalSymbols
        function setParams(instance) {
          globalThis.setParamsArgs = arguments;
        }
        // noinspection JSUnusedLocalSymbols
        function* initialize(instance, puzzle) {
          globalThis.initializeArgs = arguments;
        }
        // noinspection JSUnusedLocalSymbols
        function validate(instance, puzzle) {
          globalThis.validateArgs = arguments;
          return true;
        }
        // noinspection JSUnusedLocalSymbols
        function* update(instance, puzzle) {
          globalThis.updateArgs = arguments;
        }
      `,
    );

    const result = await this.waitFor(() => workerResult);
    channel.close();

    // Clean up the puzzle again
    window.Api.updatePuzzle((puzzle) => {
      puzzle.allConstraints = [];
    });

    return { standardComponents, ...result };
  }

  async processOnWorkerThread(scope: Record<string, IArguments>, standardComponentNames: string[]) {
    await this.waitFor(
      () =>
        scope.initialCodeArgs &&
        scope.customCodeArgs &&
        scope.getAffectedCellsArgs &&
        scope.setParamsArgs &&
        scope.initializeArgs &&
        scope.validateArgs &&
        scope.updateArgs,
    );

    const getArgsMap = (args: IArguments) => {
      const argNames = args.callee
        .toString()
        .match(/^.+\(([^)]*)\)/)![1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (argNames.length !== args.length) {
        throw new Error("Failed to parse arguments list");
      }

      return Object.fromEntries(
        argNames.map((name, index) => [name, args[index]]).filter(([key]) => !key.startsWith("__")),
      );
    };

    const initialCodeScope = getArgsMap(scope.initialCodeArgs);
    const customComponentScope = getArgsMap(scope.customCodeArgs);
    const getAffectedCellsArgs = getArgsMap(scope.getAffectedCellsArgs);
    const setParamsArgs = getArgsMap(scope.setParamsArgs);
    const initializeArgs = getArgsMap(scope.initializeArgs);
    const validateArgs = getArgsMap(scope.validateArgs);
    const updateArgs = getArgsMap(scope.updateArgs);

    this.ignoreComponentHandles(standardComponentNames, customComponentScope);

    this.markAsInternal(initialCodeScope.puzzle.state, "PuzzleState");

    for (const key of Object.keys(customComponentScope).toSorted().toReversed()) {
      if (key !== "SudokuDigitSet" && !standardComponentNames.includes(key) && key[0] === key[0].toUpperCase()) {
        this.indexRoot(customComponentScope[key], key);
      }
    }

    this.fakeBaseClass(
      "PuzzleSpecSize",
      this.indexLabel(initialCodeScope.helpers.cellIds.spec.size, "InitialCodePuzzleSpecSize"),
      this.indexLabel(customComponentScope.helpers.cellIds.spec.size, "CustomComponentPuzzleSpecSize"),
    );
    this.fakeBaseClass(
      "PuzzleSpec",
      this.indexLabel(initialCodeScope.helpers.cellIds.spec, "InitialCodePuzzleSpec"),
      this.indexLabel(customComponentScope.helpers.cellIds.spec, "CustomComponentPuzzleSpec"),
    );

    for (const key of [
      "cellIds",
      "outerCellIds",
      "edgeIds",
      "cornerIds",
      "digits",
      "sums",
      "xSums",
      "geometry",
      "naming",
      "connectivity",
      "lines",
      "misc",
    ]) {
      const camelCaseKey = key[0].toUpperCase() + key.substring(1);
      const initialCodeHelper = initialCodeScope.helpers[key];
      const customComponentHelper = customComponentScope.helpers[key];
      const initialCodeHelperClass = initialCodeHelper && this.getRealClass(initialCodeHelper);
      const customComponentHelperClass = customComponentHelper && this.getRealClass(customComponentHelper);
      if (
        initialCodeHelperClass &&
        customComponentHelperClass &&
        initialCodeHelperClass !== customComponentHelperClass
      ) {
        this.indexLabel(initialCodeHelperClass, `${SmCodeScanner.initialCodeScopeHandle}${camelCaseKey}Helper`);
        this.indexLabel(
          customComponentHelperClass,
          `${SmCodeScanner.customComponentCodeScopeHandle}${camelCaseKey}Helper`,
        );
      } else {
        this.indexLabel(initialCodeHelperClass ?? customComponentHelperClass, `${camelCaseKey}Helper`);
      }
    }

    this.indexLabel(initialCodeScope.helpers.misc.geometryHelper, "NestedGeometryHelperValue");
    this.fakeBaseClass(
      "Helpers",
      this.indexLabel(initialCodeScope.puzzle.helpers, `${SmCodeScanner.initialCodeScopeHandle}Helpers`),
      this.indexLabel(updateArgs.puzzle.helpers, `${SmCodeScanner.customComponentCodeScopeHandle}Helpers`),
    );
    this.indexLabel(initialCodeScope.puzzle, "InitialCodePuzzle");
    this.indexLabel(updateArgs.instance, "CustomComponentInstance");
    this.indexLabel(this.getClass(Object.getPrototypeOf(updateArgs.puzzle)), "PuzzleBase");
    this.indexLabel(this.getClass(updateArgs.puzzle), "CustomComponentPuzzleBase");
    this.fakeBaseClass(
      "Env",
      this.indexLabel(initialCodeScope.env, "InitialCodeEnv"),
      this.indexLabel(customComponentScope.env, "CustomComponentEnv"),
    );
    this.fakeBaseClass(
      SmCodeScanner.globalScopeHandle,
      this.indexRoot(initialCodeScope, SmCodeScanner.initialCodeScopeHandle),
      this.indexRoot(customComponentScope, SmCodeScanner.customComponentCodeScopeHandle),
    );
    this.indexRoot(getAffectedCellsArgs, "GetAffectedCellsArgs");
    this.indexRoot(setParamsArgs, "SetParamsArgs");
    this.indexRoot(initializeArgs, "InitializeArgs");
    this.indexRoot(validateArgs, "ValidateArgs");
    this.indexRoot(updateArgs, "UpdateArgs");

    // TODO: move all of that to separate methods
    type AnyTreeNodeValue = IndexObject<false> | IndexClass<false>;
    interface TreeNode<T extends AnyTreeNodeValue = AnyTreeNodeValue> {
      id: string;
      object: T;
      parent?: TreeNode<IndexClass<false>>;
      children: TreeNode[];
    }
    const nodesIndex: Record<string, TreeNode> = {};
    for (const [id, object] of Object.entries(this.objectsIndex)) {
      if (object.type === "object" || object.type === "class") {
        nodesIndex[id] = { id, object, children: [] };
      }
    }
    for (const node of Object.values(nodesIndex)) {
      const { object } = node;
      const parentRef = object.type === "object" ? object.class : object.extends;
      if (parentRef?.type !== "reference") {
        continue;
      }
      const parent = this.resolveReference(parentRef);
      if (parent.type !== "class") {
        throw new Error("Unexpected class type");
      }
      node.parent = nodesIndex[parentRef.id] as TreeNode<IndexClass<false>>;
      node.parent.children.push(node);
    }

    for (const [id, node] of Object.entries(nodesIndex)) {
      if (
        node.object.type === "class" &&
        !this.roots.has(id) &&
        node.children.length === 1 &&
        node.object.references.filter((ref) => ref !== id).length === 1 &&
        (!node.object.static || node.children[0].object.type === "class")
      ) {
        const childNode = node.children[0];
        const childObject = childNode.object;
        console.log("Single detected:", id, node.object, childNode.id, childObject);
        if (node.object.ownProperties) {
          childObject.ownProperties = { ...childObject.ownProperties, ...node.object.ownProperties };
        }
        if (node.object.static && childObject.type === "class") {
          childObject.static = { ...childObject.static, ...node.object.static };
        }
        if (childObject.type === "object") {
          childObject.class = node.object.extends;
        } else {
          childObject.extends = node.object.extends;
        }
        childNode.parent = node.parent;
        if (node.parent) {
          node.parent.children.push(childNode);
          node.parent.children = node.parent.children.filter((node2) => node2 !== node);
        }
        delete this.objectsIndex[id];
        delete nodesIndex[id];
      }
    }

    for (let wave = 1; ; wave++) {
      console.log(`Wave ${wave}...`);
      const logs: any[][] = [];

      let changed = false;

      for (const node of Object.values(nodesIndex)) {
        if (this.roots.has(node.id)) {
          continue;
        }

        const object = node.object;
        const childrenNodes = node.children;
        if (childrenNodes.length === 0) {
          continue;
        }
        const childrenIds = childrenNodes.map((childNode) => childNode.id);
        const childrenObjects = childrenNodes.map((childNode) => childNode.object);
        const childrenProps = childrenObjects.map((childObject) => childObject.ownProperties).filter((v) => !!v);
        if (childrenProps.length !== childrenNodes.length) {
          continue;
        }
        const propNames = [...new Set(childrenProps.flatMap((props) => Object.keys(props)))];
        logs.push(["Candidate for props move:", node.id, childrenIds, propNames]);
        const movedProps: string[] = [];
        const partiallyMissingProps: string[] = [];
        for (const propName of propNames) {
          const values = childrenProps.map((childProps) =>
            childProps[propName] === undefined ? undefined : JSON.stringify(childProps[propName]),
          );
          if (values.every((value) => value === values[0])) {
            object.ownProperties ??= {};
            object.ownProperties[propName] = childrenProps[0][propName];
            for (const [index, childProps] of childrenProps.entries()) {
              delete childProps[propName];
              if (Object.keys(childProps).length === 0) {
                delete childrenObjects[index].ownProperties;
              }
            }
            movedProps.push(propName);
            changed = true;
          } else {
            if (values.includes(undefined)) {
              partiallyMissingProps.push(propName);
            } else {
              logs.push(["Failed to move", propName, "- mismatching", values]);
            }
          }
        }
        if (partiallyMissingProps.length) {
          logs.push(["Failed to move", partiallyMissingProps, "- missing on some objects"]);
        }
        if (movedProps.length) {
          console.log("Moved", movedProps, "from", childrenIds, "to", node.id);
        }
      }

      for (const node of Object.values(nodesIndex)) {
        const childrenNodes = node.children.filter(
          (childNode) => !childNode.object.ownProperties && !this.roots.has(childNode.id),
        );
        const childrenObjects = childrenNodes.map((childNode) => childNode.object);

        const emptyInstances = childrenObjects.filter(
          (obj): obj is IndexObject<false> => obj.type === "object" && !this.roots.has(obj.reference.id),
        );
        if (emptyInstances.length > 1) {
          console.log(
            "Unifying empty instances of",
            node.id,
            ":",
            emptyInstances.map((obj) => obj.reference.id),
          );
          const newReference: IndexReferenceById = {
            type: "reference",
            id: `InstanceOf${node.id}`,
          };
          const newObject: IndexObject<false> = {
            ...emptyInstances[0],
            reference: newReference,
            references: emptyInstances.flatMap((object) => object.references),
          };
          this.registerObject(newReference, newObject);
          const newNode: TreeNode = {
            id: newReference.id,
            object: newObject,
            parent: node as TreeNode<IndexClass<false>>,
            children: [],
          };
          nodesIndex[newReference.id] = newNode;
          const oldIds = emptyInstances.map((object) => object.reference.id);
          for (const object of emptyInstances) {
            delete this.objectsIndex[object.reference.id];
            delete nodesIndex[object.reference.id];
            // The reference object is shared - updating the ID here will update it for everyone who point to the object.
            object.reference.id = newReference.id;
          }
          node.children = node.children.filter((childNode) => !oldIds.includes(childNode.id));
          node.children.push(newNode);
          changed = true;
        }

        const emptyClasses = childrenObjects.filter(
          (obj): obj is IndexClass<false> => obj.type === "class" && !obj.static,
        );
        if (emptyClasses.length) {
          logs.push(["Empty sub-classes", node.id, ":", emptyClasses.map((obj) => obj.reference.id)]);
          // TODO
        }
      }

      if (!changed) {
        for (const args of logs) {
          console.log(...args);
        }
        break;
      }
    }

    const objectsIndex = this.finalizeIndexing();

    new BroadcastChannel(SmCodeScanner.channelName).postMessage(objectsIndex);
  }
}
