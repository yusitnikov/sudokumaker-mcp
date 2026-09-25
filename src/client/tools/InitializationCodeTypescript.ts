import { TypescriptProgram } from "../../typescript/TypescriptProgram";
import { SnippetTypescript } from "./typecheckSnippet";
import type { BackendResources } from "../../BackendResources";
import { CustomComponentCodeTypescript } from "./typecheckCustomComponentCode";
import type { CustomElementPublic } from "../../elements/CustomElement";

let baseProgram: TypescriptProgram | undefined;

export class InitializationCodeTypescript extends SnippetTypescript {
  constructor(
    backendResources: BackendResources,
    /** Custom components map: name => code */
    private readonly customComponents: Record<string, string> = {},
  ) {
    super(backendResources, "initialization code");
  }

  static typecheckElement(
    { config: { initializationCode, customComponents } }: CustomElementPublic,
    backendResources: BackendResources,
  ) {
    return new InitializationCodeTypescript(backendResources, customComponents).typecheck(initializationCode);
  }

  getProgram() {
    baseProgram ??= super.getProgram().withFiles({
      "/initialCodeGlobals.d.ts": this.backendResources.declarations.initialCodeGlobals,
    });

    const componentsParser = new CustomComponentCodeTypescript(this.backendResources, this.customComponents);
    const declarations = componentsParser.getClassesCode("  ");

    return baseProgram.withFiles({
      "/components.d.ts": `import { Component } from "./types";\n\ndeclare global {\n${declarations}}\n`,
    });
  }
}
