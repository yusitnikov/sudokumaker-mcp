import { z } from "zod";
import { CustomElementToolImplementation } from "./CustomElementToolImplementation";
import { editInitializationCodeToolName } from "./toolNames";
import { CustomElement } from "../../elements/CustomElement";
import { customConstraintsTopicName } from "./docs/topicNames";
import { editText, editTextOperation } from "./editText";
import type { BackendResources } from "../../BackendResources";
import { getSnippetDiagnostics, type SnippetScope, typecheckSnippet } from "./typecheckSnippet";

/**
 * Declares the element's own components, which the initialization code constructs by bare name.
 *
 * Their constructor parameters can't be recovered - the real signature is only discoverable by
 * analyzing user code this doesn't parse, and `unknown[]` would reject every real call site.
 */
const buildCustomComponentDeclarations = (customComponentNames: string[]) => {
  const declarations = customComponentNames
    .map((name) => `  class ${name} extends Component { constructor(...args: any[]); }\n`)
    .join("");

  return `import { Component } from "./types";\n\ndeclare global {\n${declarations}}\n`;
};

/** What the initialization code is checked against: its own globals, plus the element's components. */
const scope = ({ declarations }: BackendResources, customComponentNames: string[]): SnippetScope => ({
  globals: declarations.initialCodeGlobals,
  extraDeclarations: { "/components.d.ts": buildCustomComponentDeclarations(customComponentNames) },
});

export const getInitializationCodeDiagnostics = (
  backendResources: BackendResources,
  code: string,
  customComponentNames: string[] = [],
) => getSnippetDiagnostics(backendResources, scope(backendResources, customComponentNames), code);

/**
 * Typechecks initialization code against the declarations scanned out of the app, returning the
 * problems as text - or `undefined` when there are none.
 *
 * The code is compiled verbatim, so every diagnostic's line number is the author's own.
 */
export const typecheckInitializationCode = (
  backendResources: BackendResources,
  code: string,
  customComponentNames: string[] = [],
): string | undefined =>
  typecheckSnippet(backendResources, scope(backendResources, customComponentNames), code, "initialization code");

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
    return typecheckInitializationCode(
      resources,
      targetElement.config.initializationCode,
      Object.keys(targetElement.config.customComponents),
    );
  },
);
