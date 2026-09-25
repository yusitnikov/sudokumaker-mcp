// Reads the app's solver settings out of localStorage, where the app persists them as JSON.
// Runs page-side. `window.Api` exposes no settings, so this is the only way to get them.
// The shapes below are hand-written, like the `window.Api` declarations, and unchecked against the app.
// A key is missing until the app has saved those settings, and then the app's defaults apply.

export interface LogicalSolverSettings {
  strategy: {
    stepTypes: string[];
    useRandomness: boolean;
  };
}

export interface BruteForceSolverSettings {
  /** How many solutions the search counts before it stops. */
  solutionCountLimit: number;
  /** How many seconds the search may spend finding each next solution. */
  solveTimeLimit: number;
}

const defaultBruteForceSolverSettings: BruteForceSolverSettings = {
  solutionCountLimit: 10000,
  solveTimeLimit: 60,
};

const readSettings = <T>(key: string): T | undefined => {
  const json = localStorage.getItem(key);
  return json === null ? undefined : JSON.parse(json);
};

/** The logical solver's settings, or `undefined` if the app hasn't saved any. */
export const readLogicalSolverSettings = () => readSettings<LogicalSolverSettings>("logicalSolverSettings");

/** Whether the logical solver may make deductions by contradiction - by default, it may. */
export const areContradictionsAllowed = () => {
  const settings = readLogicalSolverSettings();
  return settings ? settings.strategy.stepTypes.includes("byContradiction") : true;
};

/** The brute-force solver's settings. */
export const readBruteForceSolverSettings = () =>
  readSettings<BruteForceSolverSettings>("solverSettings") ?? defaultBruteForceSolverSettings;
