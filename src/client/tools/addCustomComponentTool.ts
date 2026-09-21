import { z } from "zod";
import { CustomElementToolImplementation } from "./CustomElementToolImplementation";
import { addCustomComponentToolName } from "./toolNames";
import { CustomElement } from "../../elements/CustomElement";
import { customComponentsTopicName } from "./docs/topicNames";
import { CustomComponentCodeTypescript } from "./typecheckCustomComponentCode";

export const addCustomComponentTool = new CustomElementToolImplementation(
  {
    name: addCustomComponentToolName,
    title: "Add a custom component",
    description:
      // language=markdown
      `
Add a new custom component to a \`${CustomElement.typeName}\` element.

Read the \`${customComponentsTopicName}\` docs topic before using this tool -
the component's API cannot be guessed.
`.trim(),
    inputSchema: z.object({
      name: z
        .string()
        .describe("Name for the new component - the identifier the initialization code passes to its constructor."),
      code: z.string().describe("The component's JavaScript implementation."),
    }),
  },
  function (targetElement, { name, code }, elementName, puzzleName) {
    this.checkCustomComponentNameIsFree(targetElement, name);

    targetElement.config.customComponents[name] = code;

    return `Added custom component "${name}" to "${elementName}" in puzzle "${puzzleName}".`;
  },

  function (targetElement, { name }, resources) {
    return new CustomComponentCodeTypescript(resources, targetElement.config.customComponents).typecheckComponent(name);
  },
);
