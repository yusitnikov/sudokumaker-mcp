import { z } from "zod";
import {
  CustomElementToolImplementation,
  countWholeWordOccurrences,
  replaceWholeWord,
} from "./CustomElementToolImplementation";
import { editInitializationCodeToolName, renameCustomComponentToolName } from "./toolNames";
import { CustomElement } from "../../elements/CustomElement";

export const renameCustomComponentTool = new CustomElementToolImplementation(
  {
    name: renameCustomComponentToolName,
    title: "Rename a custom component",
    description:
      // language=markdown
      `Rename one custom component of a \`${CustomElement.typeName}\` element.`,
    inputSchema: z.object({
      name: z.string().describe("Current name of the component to rename."),
      newName: z.string().describe("New name for the component."),
      keepInitializationCode: z
        .boolean()
        .optional()
        .describe(
          "Rename only the component, leaving the initialization code as it is - for when the name means something else there.",
        ),
    }),
  },
  function (targetElement, { name, newName, keepInitializationCode }, elementName, puzzleName) {
    const code = this.getCustomComponentCode(targetElement, name);
    this.checkCustomComponentNameIsFree(targetElement, newName);

    const { customComponents, initializationCode } = targetElement.config;
    const occurrences = countWholeWordOccurrences(initializationCode, name);

    // Rebuilt rather than reassigned, so the renamed component keeps its position among the others.
    targetElement.config.customComponents = Object.fromEntries(
      Object.entries(customComponents).map(([key, value]) => (key === name ? [newName, code] : [key, value])),
    );

    if (occurrences > 0 && !keepInitializationCode) {
      targetElement.config.initializationCode = replaceWholeWord(initializationCode, name, newName);
    }

    const heading = `Renamed custom component "${name}" of "${elementName}" to "${newName}" in puzzle "${puzzleName}".`;

    if (occurrences === 0) {
      return `${heading}\nThe initialization code didn't mention "${name}", so it was left as it is.`;
    }

    if (keepInitializationCode) {
      return (
        `${heading}\n[WARNING] The initialization code still mentions "${name}" ${occurrences} time(s), left as it is on request - ` +
        `the constraint won't work until those are dealt with (\`${editInitializationCodeToolName}\`).`
      );
    }

    return `${heading}\nRenamed ${occurrences} mention(s) of it in the initialization code as well.`;
  },
);
