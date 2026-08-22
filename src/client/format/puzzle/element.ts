import {
  type ElementPublic,
  getElementByTypeName,
} from "../../../SudokuMakerElement";
import type { ObjectDescriptor } from "../ObjectDescriptor";
import type { PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";
import { indent } from "../generic/indent";
import { regionsDescriptor } from "./regions";
import { getClueDescriptor } from "./clue";
import { getArrayDescriptor } from "../generic/arrayDescriptor";
import {
  getPlainObjectDescriptor,
  type ObjectDescriptorsMap,
} from "../generic/plainObjectDescriptor";
import { stringDescriptor } from "../generic/stringDescriptor";
import { scalarDescriptor } from "../generic/scalarDescriptor";
import { getElementFinalName } from "../../tools/elementUtils";

const elementBaseDescriptor = getPlainObjectDescriptor<
  ElementPublic,
  PuzzlePublic
>({
  childMap: {
    id: scalarDescriptor,
    name: stringDescriptor,
    enabled: scalarDescriptor,
    solverIgnored: scalarDescriptor,
    config: (node) => {
      const elementType = getElementByTypeName(node.value.config.type);

      const cluesKey = elementType.clue?.key;

      const childMap: ObjectDescriptorsMap<
        ElementPublic["config"],
        PuzzlePublic
      > = {
        // TODO: fix this mess
        regions: regionsDescriptor,
      };
      if (cluesKey) {
        (childMap as any)[cluesKey] = getArrayDescriptor({
          itemDescriptor: getClueDescriptor(elementType),
        });
      }

      return getPlainObjectDescriptor<ElementPublic["config"], PuzzlePublic>({
        childMap,
        ignoredKeys: ["type"],
      });
    },
  },
  allowOtherKeys: false,
  ignoredKeys: ({ config }) =>
    Object.keys(config).length === 1 ? ["config"] : [],
});

/** Element - getElementSummary + description, then config fields (scalars, style, clues). */
export const elementDescriptor: ObjectDescriptor<ElementPublic, PuzzlePublic> =
  {
    ...elementBaseDescriptor,

    format(node, opts) {
      let header = `"${getElementFinalName(node.value)}" (type ${node.value.config.type}, ID ${node.value.id}, ${!node.value.enabled ? "disabled" : node.value.solverIgnored ? "solver-ignored" : "enabled"})`;
      if (!opts.skipHandle) {
        header += ` — ${node.handle}`;
      }
      if (opts.collapse) {
        // Short form: the header line alone - identity beats content for an element neighbor.
        return header;
      }

      const lines = [`${header} {`];

      const description = node.value.elementMetadata?.description;
      if (description) {
        lines.push(`  // ${description}`);
      }

      try {
        lines.push(indent(`config: ${node.child("config").format(opts)}`));
      } catch {
        // skip empty field
      }

      lines.push("}");
      return lines.join("\n");
    },

    diff(from, to) {
      return `"${getElementFinalName(to.value)}" (type ${to.value.config.type}) ${elementBaseDescriptor.diff(from, to)}`;
    },
  };
