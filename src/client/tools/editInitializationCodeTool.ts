import { z } from "zod";
import { CustomElementToolImplementation } from "./CustomElementToolImplementation";
import { editInitializationCodeToolName } from "./toolNames";
import { CustomElement } from "../../elements/CustomElement";
import { customConstraintsTopicName } from "./docs/topicNames";
import { editText, editTextOperation } from "./editText";

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
);
