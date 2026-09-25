import { TypescriptProgram } from "../../typescript/TypescriptProgram";
import { SnippetTypescript } from "./typecheckSnippet";
import type { BackendResources } from "../../BackendResources";
import { CustomComponentCodeTypescript } from "./typecheckCustomComponentCode";
import type { CustomElementPublic } from "../../elements/CustomElement";
import { customConstraintsTopicName, typesReferenceTopicName } from "./docs/topicNames";

let baseProgram: TypescriptProgram | undefined;
let baseProgramWithInputGroups: TypescriptProgram | undefined;

export class InitializationCodeTypescript extends SnippetTypescript {
  constructor(
    backendResources: BackendResources,
    private readonly isGlobal: boolean,
    /** Custom components map: name => code */
    private readonly customComponents: Record<string, string> = {},
  ) {
    super(backendResources, "initialization code", [customConstraintsTopicName, typesReferenceTopicName]);
  }

  static typecheckElement(
    { config: { initializationCode, isGlobal, customComponents } }: CustomElementPublic,
    backendResources: BackendResources,
  ) {
    return new InitializationCodeTypescript(backendResources, isGlobal, customComponents).typecheck(initializationCode);
  }

  getProgram() {
    baseProgram ??= super.getProgram().withFiles({
      "/initialCodeGlobals.d.ts": this.backendResources.declarations.initialCodeGlobals,
    });

    let program = baseProgram;

    if (!this.isGlobal) {
      baseProgramWithInputGroups ??= baseProgram.withFiles({
        "/inputGroupsGlobals.d.ts": this.backendResources.declarations.inputGroupsGlobals,
      });

      program = baseProgramWithInputGroups;
    }

    if (Object.keys(this.customComponents).length !== 0) {
      const componentsParser = new CustomComponentCodeTypescript(this.backendResources, this.customComponents);
      const declarations = componentsParser.getClassesCode("  ");
      program = program.withFiles({
        "/components.d.ts": `import { Component } from "./types";\n\ndeclare global {\n${declarations}}\n`,
      });
    }

    return program;
  }
}
