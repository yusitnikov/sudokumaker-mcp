import { z } from "zod";
import { CustomElementToolImplementation, countWholeWordOccurrences } from "./CustomElementToolImplementation";
import { editInitializationCodeToolName, removeCustomComponentToolName } from "./toolNames";
import { CustomElement } from "../../elements/CustomElement";

export const removeCustomComponentTool = new CustomElementToolImplementation(
  {
    definition: {
      name: removeCustomComponentToolName,
      title: "Remove a custom component",
      description:
        // language=markdown
        `Delete one custom component from a \`${CustomElement.typeName}\` element.`,
    },
  },
  {
    name: z.string().describe("Name of the component to remove."),
  },
  function (targetElement, { name }, elementName, puzzleName) {
    this.getCustomComponentCode(targetElement, name);

    const occurrences = countWholeWordOccurrences(targetElement.config.initializationCode, name);

    delete targetElement.config.customComponents[name];

    const heading = `Removed custom component "${name}" from "${elementName}" in puzzle "${puzzleName}".`;

    if (occurrences === 0) {
      return heading;
    }

    return (
      `${heading}\n[WARNING] The initialization code still mentions "${name}" ${occurrences} time(s) - ` +
      `the constraint won't work until those are dealt with (\`${editInitializationCodeToolName}\`).`
    );
  },
);
