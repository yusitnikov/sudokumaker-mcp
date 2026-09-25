import type { DocsTopic } from "./topics";
import { customComponentsTopicName, customConstraintsTopicName, typesReferenceTopicName } from "./topicNames";
import { backendResources } from "../../../backendResourcesImpl";

/** A generated declaration file without its leading one-line comment. */
const withoutLeadingComment = (source: string) => source.replace(/^\/\/[^\n]*\n/, "").trim();

export const typesReferenceTopic: DocsTopic = {
  name: typesReferenceTopicName,
  description: "TypeScript declarations of every type, class and utility object available to custom constraint code.",
  content: () => {
    const { types, globals } = backendResources.declarations;

    // language=markdown
    return `
# Types reference

The TypeScript declarations for custom constraint code.
\`types.d.ts\` declares the types.
\`globals.d.ts\` declares the classes, enums and utility objects
that both the initialization code and custom components can use without declaring them.
The variables that only one of the two gets are described in topics \`${customConstraintsTopicName}\` (initialization code)
and \`${customComponentsTopicName}\` (custom components).

## \`types.d.ts\`

\`\`\`ts
${withoutLeadingComment(types)}
\`\`\`

## \`globals.d.ts\`

\`\`\`ts
${withoutLeadingComment(globals)}
\`\`\`
`;
  },
};
