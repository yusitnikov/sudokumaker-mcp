// Collects the errors the app publishes on `window.errorBus` - the ones it shows as toasts.
// Today that is only errors thrown by custom constraint code while the app re-checks the grid for
// conflicts: the solver itself swallows them, so this bus is the only place they reach the page.
// The bus keeps no history, so an error is only seen by a listener that was subscribed when it fired.

export interface SudokuMakerError {
  // What the app was doing, naming the constraint (e.g. "Error while updating custom constraint Foo").
  context: string;
  // Whatever was thrown - usually an `Error`, but custom code can throw anything.
  error: unknown;
}

type SudokuMakerErrorListener = (error: SudokuMakerError) => void;

declare global {
  interface Window {
    errorBus: {
      on(event: "error", listener: SudokuMakerErrorListener): void;
      off(event: "error", listener: SudokuMakerErrorListener): void;
    };
  }
}

const collectedErrors: SudokuMakerError[] = [];

/** Starts collecting every error published on the app's error bus from now on. */
export function subscribeToSudokuMakerErrors() {
  window.errorBus.on("error", (error) => {
    collectedErrors.push(error);
  });
}

/** Forgets the errors collected so far. */
export function clearSudokuMakerErrors() {
  collectedErrors.length = 0;
}

/** The errors collected since the last clear, oldest first. */
export function getSudokuMakerErrors(): readonly SudokuMakerError[] {
  return collectedErrors;
}