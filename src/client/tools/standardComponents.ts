import standardComponents from "../../generated/standardComponents.json";

type StandardComponent = (typeof standardComponents)[number];

const standardComponentsMap = new Map(
  standardComponents.flatMap((component) => [component.name, ...component.aliases].map((name) => [name, component])),
);

export const getStandardComponentByName = (name: string) => standardComponentsMap.get(name);

export const formatStandardComponent = ({ name, definition, description }: StandardComponent) =>
  `\`${name}${definition}\`\n  ${description.split("\n").join("\n  ")}`;
