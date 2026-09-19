import { z } from "zod";
import { CustomElementToolImplementation } from "./CustomElementToolImplementation";
import { editCustomComponentCodeToolName } from "./toolNames";
import { CustomElement } from "../../elements/CustomElement";
import { customComponentsTopicName } from "./docs/topicNames";
import { editText, editTextOperation } from "./editText";
import { typecheckCustomComponentCode } from "./typecheckCustomComponentCode";

export const editCustomComponentCodeTool = new CustomElementToolImplementation(
  {
    name: editCustomComponentCodeToolName,
    title: "Edit a custom component's code",
    description:
      // language=markdown
      `
Change one custom component's code in a \`${CustomElement.typeName}\` element.
See the \`operation\` parameter for the available ways to change it.

Read the \`${customComponentsTopicName}\` docs topic before using this tool -
the component's API cannot be guessed.
`.trim(),
    inputSchema: z.object({
      name: z.string().describe("Name of the component to edit."),
      operation: editTextOperation,
    }),
  },
  function (targetElement, { name, operation }, elementName, puzzleName) {
    const code = this.getCustomComponentCode(targetElement, name);

    targetElement.config.customComponents[name] = editText(code, operation);

    return `Updated custom component "${name}" of "${elementName}" in puzzle "${puzzleName}".`;
  },

  function (targetElement, { name }, resources) {
    return typecheckCustomComponentCode(resources, targetElement.config.customComponents[name]);
  },
);
