import { z } from "zod";
import { CustomElementToolImplementation } from "./CustomElementToolImplementation";
import { editInitializationCodeToolName } from "./toolNames";
import { CustomElement } from "../../elements/CustomElement";
import { customConstraintsTopicName } from "./docs/topicNames";
import { editText, editTextOperation } from "./editText";
import type { BackendResources } from "../../BackendResources";
import { SnippetTypescript } from "./typecheckSnippet";
import { TypescriptProgram } from "../../typescript/TypescriptProgram";

export const editInitializationCodeTool = new CustomElementToolImplementation(
  {
    name: editInitializationCodeToolName,
    title: "Edit Custom element's initialization code",
    description:
      // language=markdown
      `
Change a \`${CustomElement.typeName}\` element's \`initializationCode\`.
See the \`operation\` parameter for the available ways to change it.

Read the \`${customConstraintsTopicName}\` docs topic before using this tool -
its API and conventions cannot be guessed.
`.trim(),
    inputSchema: z.object({ operation: editTextOperation }),
  },

  function (targetElement, { operation }, elementName, puzzleName) {
    targetElement.config.initializationCode = editText(targetElement.config.initializationCode, operation);

    return `Updated "${elementName}"'s initialization code in puzzle "${puzzleName}".`;
  },

  function (targetElement, _params, resources) {
    // TODO: do the same typecheck when creating a new custom element
    return new InitializationCodeTypescript(resources, Object.keys(targetElement.config.customComponents)).typecheck(
      targetElement.config.initializationCode,
    );
  },
);

let baseProgram: TypescriptProgram | undefined;

export class InitializationCodeTypescript extends SnippetTypescript {
  constructor(
    backendResources: BackendResources,
    private readonly customComponentNames: string[] = [],
  ) {
    super(backendResources, "initialization code");
  }

  getProgram() {
    /**
     * Declares the element's own components, which the initialization code constructs by bare name.
     *
     * Their constructor parameters can't be recovered - the real signature is only discoverable by
     * analyzing user code this doesn't parse, and `unknown[]` would reject every real call site.
     */
    const declarations = this.customComponentNames
      .map((name) => `  class ${name} extends Component { constructor(...args: any[]); }\n`)
      .join("");

    baseProgram ??= super.getProgram().withFiles({
      "/initialCodeGlobals.d.ts": this.backendResources.declarations.initialCodeGlobals,
    });

    return baseProgram.withFiles({
      "/components.d.ts": `import { Component } from "./types";\n\ndeclare global {\n${declarations}}\n`,
    });
  }
}
