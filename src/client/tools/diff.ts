import { z } from "zod";
import { PuzzleSchema } from "../../SudokuMakerPuzzleSchema";
import { toShortCellNotation } from "../utils";

export const diffCells = (
  { cells: cells1Map }: z.input<typeof PuzzleSchema>,
  { cells: cells2Map }: z.input<typeof PuzzleSchema>,
  reportNoChanges = false,
) => {
  const cells1 = cells1Map.flat();
  const cells2 = cells2Map.flat();

  const groupedDiffMap: Record<string, string[]> = {};

  for (const [index, { row, column, ...cell1 }] of cells1.entries()) {
    const { row: _row, column: _column, ...cell2 } = cells2[index];

    const [empty1, empty2] = [cell1, cell2].map(
      (cell) =>
        !cell.given &&
        cell.value === undefined &&
        cell.valid &&
        !cell.candidates.length &&
        !cell.cornerPencilMarks.length &&
        !cell.colors.length,
    );

    const changes: string[] = [];
    let dumped = false;
    const dump = JSON.stringify(cell2);

    if (empty1 !== empty2) {
      if (empty2) {
        changes.push("turned empty");
      } else {
        dumped = true;
        changes.push(`turned into ${dump}`);
      }
    } else if (cell1.given !== cell2.given) {
      if (cell2.given) {
        changes.push(`placed a given ${cell2.value}`);
      } else {
        dumped = true;
        changes.push(`removed the given, new state is ${dump}`);
      }
    } else if (cell1.value !== cell2.value) {
      if (typeof cell2.value === "number") {
        changes.push(
          `placed a ${cell2.given ? "given" : "value"} ${cell2.value}`,
        );
      } else {
        dumped = true;
        changes.push(`removed the value, new state is ${dump}`);
      }
    } else {
      const diffCandidates = (c1: number[], c2: number[], word: string) => {
        const newCandidates = c2.filter((c) => !c1.includes(c));
        const removedCandidates = c1.filter((c) => !c2.includes(c));

        if (!newCandidates.length && !removedCandidates.length) {
          return;
        }

        if (!c2.length) {
          changes.push(`${word} turned empty`);
          return;
        }

        const dump = `${word} turned into ${JSON.stringify(c2)}`;

        if (!newCandidates.length && removedCandidates.length <= c2.length) {
          changes.push(`${dump} (removed ${removedCandidates.join(", ")})`);
          return;
        }

        if (!removedCandidates.length && newCandidates.length <= c1.length) {
          changes.push(`${dump} (added ${newCandidates.join(", ")})`);
          return;
        }

        changes.push(dump);
      };

      diffCandidates(cell1.candidates, cell2.candidates, "candidates");
      diffCandidates(
        cell1.cornerPencilMarks,
        cell2.cornerPencilMarks,
        "corner marks",
      );
      diffCandidates(cell1.colors, cell2.colors, "colors");
    }

    if (!dumped && cell1.valid !== cell2.valid) {
      changes.push(cell2.valid ? "turned valid" : "turned invalid");
    }

    if (changes.length) {
      (groupedDiffMap[changes.join(", ")] ??= []).push(
        toShortCellNotation({ row, column }),
      );
    }
  }

  const diff = Object.entries(groupedDiffMap).map(
    ([changes, positions]) => `- ${positions.join(", ")}: ${changes}`,
  );

  return diff.length
    ? ["Grid cells changed:", ...diff].join("\n")
    : reportNoChanges
      ? "Grid cells didn't change"
      : "";
};
