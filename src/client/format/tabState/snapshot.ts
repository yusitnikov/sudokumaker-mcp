import type { TabStateSnapshot } from "../../tabState";
import { ObjectNode } from "../ObjectNode";
import { getPlainObjectDescriptor } from "../generic/plainObjectDescriptor";
import { solverLogsDescriptor } from "./solverLogs";
import { puzzleDescriptor } from "../puzzle/puzzle";
import type { PuzzlePublic } from "../../../SudokuMakerPuzzleSchema";

const tabStateSnapshotDescriptor = getPlainObjectDescriptor<
  TabStateSnapshot,
  PuzzlePublic
>({
  childMap: {
    puzzle: puzzleDescriptor,
    solverLogs: solverLogsDescriptor,
  },
});

export const getTabStateSnapshotNode = (snapshot: TabStateSnapshot) =>
  new ObjectNode(
    snapshot,
    () => {
      throw new Error("This snapshot is read-only");
    },
    "",
    snapshot.puzzle,
    tabStateSnapshotDescriptor,
  );
