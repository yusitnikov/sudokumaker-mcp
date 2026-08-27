export interface FormatOpts {
  /** true = one-line short form; false = full content, cut at the size floor per node. */
  collapse: boolean;
  /** Do not print handles. */
  skipHandle?: boolean;
}
