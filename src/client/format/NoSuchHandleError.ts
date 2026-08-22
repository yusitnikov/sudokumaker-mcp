/**
 * Thrown by `child` when a segment doesn't resolve. Named after the last successfully-resolved
 * handle and what that node accepts, so the caller can report a precise retry without a second
 * lookup - the node that rejected the segment is the one that writes this message.
 */
export class NoSuchHandleError extends Error {
  constructor(resolvedHandle: string, accepts: string) {
    super(
      `No such handle (resolved as far as "${resolvedHandle || "<root>"}"). Handles available there: ${accepts}.`,
    );
  }
}
