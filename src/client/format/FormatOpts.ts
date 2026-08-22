export interface FormatOpts {
  /** true = one-line short form; false = full content, cut at the size floor per node. */
  collapse: boolean;
  /** Handles to print in full regardless of length. */
  expanded?: Set<string>;
  /** Do not print handles. */
  skipHandle?: boolean;
}
