import { type PuzzlePublic, PuzzleSchema } from "../SudokuMakerPuzzleSchema";
import { readSudokuMakerLogs, type SudokuMakerLogEntry } from "../SudokuMakerLogs";
import { readPendingActionLabel } from "../SudokuMakerUndoRedo";
import { stringifyValue } from "./format/generic/stringifyValue";
import { getTabStateSnapshotNode } from "./format/tabState/snapshot";
import { getElementByConfig } from "../SudokuMakerElement";

/** Everything about a tab that a tool response may need to report on. */
export interface TabStateSnapshot {
  puzzle: PuzzlePublic;
  /** The app's own name for what `undo` would revert, or `undefined` when there's nothing to undo. */
  undoLabel: string | undefined;
  /** The app's own name for what `redo` would reapply, or `undefined` when there's nothing to redo. */
  redoLabel: string | undefined;
  solverLogs: SudokuMakerLogEntry[];
}

/** Reads the tab's current state straight from the app. */
const getTabStateSnapshot = (): TabStateSnapshot => ({
  puzzle: getPuzzle(),
  undoLabel: readPendingActionLabel("undo"),
  redoLabel: readPendingActionLabel("redo"),
  solverLogs: readSudokuMakerLogs(),
});

const getPuzzle = () => {
  const puzzle = PuzzleSchema.encode(window.Api.getPuzzle());

  puzzle.allElements.forEach((element) => {
    const elementType = getElementByConfig(element.config);

    const elementMetadata = elementType.getElementMetadata(element.config as any, puzzle.spec);

    element.elementMetadata = {
      defaultName: elementMetadata.title,
      description: elementMetadata.description,
    };
  });

  return puzzle;
};

/**
 * The tab's current state next to the state it had when the previous snapshot was taken,
 * with a flag per part saying whether that part changed in between.
 */
export class TabState implements TabStateSnapshot {
  private constructor(
    /** The tab's state now */
    readonly currentSnapshot: TabStateSnapshot,
    /**
     * The state the tab had when the previous snapshot was taken,
     * or `undefined` when there was none
     * (in which case every `*Changed` flag is false, there being nothing to compare against)
     */
    readonly previousSnapshot?: TabStateSnapshot,
  ) {}

  /**
   * Takes a fresh snapshot of the tab and pairs it with the one the previous call took, then stores
   * the fresh one as the baseline for the next call.
   *
   * The baseline lives on `window`, so it spans `execute_js` calls - meaning consecutive tool calls
   * see each other's changes, and so do changes the user made in the app's UI in between.
   */
  static read() {
    const previousSnapshot = window.__smMcp.lastTabStateSnapshot;
    const currentSnapshot = getTabStateSnapshot();
    window.__smMcp.lastTabStateSnapshot = currentSnapshot;

    const tabState = new TabState(currentSnapshot, previousSnapshot);

    // Loading another puzzle into the tab always rejects the current operation
    if (tabState.puzzleIdChanged) {
      throw new TabStateChangedError(tabState);
    }

    return tabState;
  }

  static async waitAndRead() {
    // Wait for the frontend to update after the changes
    await new Promise((resolve) => setTimeout(resolve, 200));

    return this.read();
  }

  // region Snapshot prop aliases
  get currentSnapshotNode() {
    return getTabStateSnapshotNode(this.currentSnapshot);
  }

  get previousSnapshotNode() {
    return this.previousSnapshot && getTabStateSnapshotNode(this.previousSnapshot);
  }

  get puzzle() {
    return this.currentSnapshot.puzzle;
  }

  get undoLabel() {
    return this.currentSnapshot.undoLabel;
  }

  get redoLabel() {
    return this.currentSnapshot.redoLabel;
  }

  get solverLogs() {
    return this.currentSnapshot.solverLogs;
  }

  get previousPuzzle() {
    return this.previousSnapshot?.puzzle;
  }

  get previousUndoLabel() {
    return this.previousSnapshot?.undoLabel;
  }

  get previousRedoLabel() {
    return this.previousSnapshot?.redoLabel;
  }

  get previousSolverLogs() {
    return this.previousSnapshot?.solverLogs;
  }
  // endregion

  // region Changed flags
  get puzzleChanged() {
    return this.previousSnapshot !== undefined && stringifyValue(this.previousPuzzle) !== stringifyValue(this.puzzle);
  }

  get puzzleIdChanged() {
    return this.previousSnapshot !== undefined && this.previousPuzzle?.id !== this.puzzle.id;
  }

  get undoLabelChanged() {
    return this.previousSnapshot !== undefined && this.previousUndoLabel !== this.undoLabel;
  }

  get redoLabelChanged() {
    return this.previousSnapshot !== undefined && this.previousRedoLabel !== this.redoLabel;
  }

  get solverLogsChanged() {
    return (
      this.previousSnapshot !== undefined && stringifyValue(this.previousSolverLogs) !== stringifyValue(this.solverLogs)
    );
  }

  /** Whether any property of the snapshot changed */
  get changed() {
    return this.puzzleChanged || this.undoLabelChanged || this.redoLabelChanged || this.solverLogsChanged;
  }
  // endregion

  get formattedSnapshot() {
    return this.currentSnapshotNode.format({ collapse: false }, true);
  }

  get formattedDiff() {
    return this.changed ? this.previousSnapshotNode?.diff(this.currentSnapshotNode) : undefined;
  }
}

export class TabStateChangedError extends Error {
  constructor(public readonly tabState: TabState) {
    super(
      `The operation was rejected because ${tabState.puzzleIdChanged ? "a different puzzle has been loaded into the tab" : "the tab state changed"} since the last tool call`,
    );
  }
}
