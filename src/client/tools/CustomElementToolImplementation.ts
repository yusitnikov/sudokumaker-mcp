import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { type Tool, ToolImplementation } from "./ToolImplementation";
import { getElementById, getElementFinalName } from "./elementUtils";
import { elementIdNote, operationDescriptionParam } from "./descriptionSnippets";
import { addElementToolName, getPuzzleToolName } from "./toolNames";
import { elementsDiffSummary } from "../format/puzzle/diffSummary";
import { CustomElement } from "../../elements/CustomElement";
import type { ElementByType } from "../../elements/types";
import { ElementType } from "../../elements/ElementType";
import type { PuzzlePublic } from "../../SudokuMakerPuzzleSchema";

type CustomElementPublic = ElementByType<ElementType.Custom>;

/** The input fields every tool targeting a `Custom` element takes, on top of its own. */
const customElementBaseShape = {
  elementId: z
    .number()
    .int()
    .describe(
      // language=markdown
      `
ID of the target \`${CustomElement.typeName}\` element, as returned by \`${getPuzzleToolName}\`/\`${addElementToolName}\`.
${elementIdNote}
      `.trim(),
    ),
  operationDescription: operationDescriptionParam,
};

type BaseShape = typeof customElementBaseShape;

/** A tool's own parameters, plus the ones every `Custom` element tool takes. */
type CustomElementToolParams<ExtraShapeT extends z.ZodRawShape> = z.input<z.ZodObject<ExtraShapeT & BaseShape>>;

/**
 * A tool that edits one `Custom` element's own fields.
 *
 * The tool declares only the fields it takes beyond `elementId`/`operationDescription`, and a callback
 * that changes the resolved element; adding the shared fields, resolving the element, writing the
 * change back and rendering the diff all happen here.
 */
export class CustomElementToolImplementation<ExtraShapeT extends z.ZodRawShape> extends ToolImplementation<
  z.ZodObject<ExtraShapeT & BaseShape>
> {
  constructor(
    tool: Omit<Tool, "definition"> & { definition: Omit<Tool["definition"], "inputSchema"> },
    extraShape: ExtraShapeT,
    private readonly _applyUpdate: (
      this: CustomElementToolImplementation<ExtraShapeT>,
      targetElement: CustomElementPublic,
      params: CustomElementToolParams<ExtraShapeT>,
    ) => (elementName: string, puzzleName: string) => string,
  ) {
    super(tool, z.object({ ...extraShape, ...customElementBaseShape }));
  }

  /**
   * Resolves an element by ID and checks it's a `Custom` element - throwing a clear domain error otherwise.
   */
  private getCustomElement(puzzle: PuzzlePublic, elementId: number) {
    const { index, targetElement } = getElementById(puzzle, elementId);
    const { typeName } = CustomElement;

    if (targetElement.config.type !== typeName) {
      // The puzzle's actual Custom elements travel with the error, so retrying costs no extra read.
      const available = puzzle.allElements
        .filter((element) => element.config.type === typeName)
        .map((element) => `"${getElementFinalName(element)}" (ID=${element.id})`)
        .join(", ");

      throw new Error(
        `Element ${elementId} has type "${targetElement.config.type}", not "${typeName}" - this tool only applies to ${typeName} elements. ` +
          `The puzzle has ${available ? `the following ${typeName} elements: ${available}` : `no ${typeName} elements at all`}.`,
      );
    }

    return { index, targetElement: targetElement as CustomElementPublic };
  }

  /**
   * Reads one of the element's custom components by name -
   * throwing a clear domain error when it has no such component.
   */
  protected getCustomComponentCode(targetElement: CustomElementPublic, name: string) {
    const code = targetElement.config.customComponents[name];

    if (code === undefined) {
      // The element's actual components travel with the error, so retrying costs no extra read.
      const available = Object.keys(targetElement.config.customComponents);

      throw new Error(
        `"${getElementFinalName(targetElement)}" has no custom component named "${name}". ` +
          `It has ${available.length ? `the following custom components: ${available.join(", ")}` : "no custom components at all"}.`,
      );
    }

    return code;
  }

  /**
   * Throws a clear domain error when the element already has a component named `name`,
   * whose code a write under that name would silently replace.
   */
  protected checkCustomComponentNameIsFree(targetElement: CustomElementPublic, name: string) {
    if (name in targetElement.config.customComponents) {
      throw new Error(
        `"${getElementFinalName(targetElement)}" already has a custom component named "${name}". ` +
          `Its custom components are: ${Object.keys(targetElement.config.customComponents).join(", ")}.`,
      );
    }
  }

  protected async _run(
    // The shared fields are named alongside the combined type: with `ExtraShapeT` still open, zod's
    // inference can't reduce the combined object to one with known keys, so they'd be unreachable.
    params: CustomElementToolParams<ExtraShapeT> & z.input<z.ZodObject<BaseShape>>,
  ): Promise<CallToolResult> {
    const { elementId, operationDescription } = params;

    const {
      tabState,
      result: { index, getSummary },
    } = await this.updatePuzzle(
      (puzzle) => {
        const { index, targetElement } = this.getCustomElement(puzzle, elementId);

        const getSummary = this._applyUpdate(targetElement, params);

        return { result: { index, getSummary } };
      },
      (from, to, { index }) => {
        to.allConstraints[index] = from.allConstraints[index];
      },
      operationDescription,
    );

    const updatedElement = tabState.puzzle.allElements[index];

    return {
      content: [
        {
          type: "text",
          text: [
            getSummary(getElementFinalName(updatedElement), tabState.puzzle.name || "(untitled)"),
            elementsDiffSummary(tabState),
          ].join("\n"),
        },
      ],
    };
  }
}
