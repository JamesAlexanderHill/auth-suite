export type StoreErrorCode =
  | "invalid-input" // eg. incorrect parameter
  | "connection-failed" // eg. Unabled to connect to the database
  | "unique-violation" // eg. duplicate email
  | "entry-not-found" // eg. User with request id does not exist
  | "unknown"; // catch-all error

export class StoreError extends Error {
  constructor(
    public readonly code: StoreErrorCode = "unknown",
    message?: string,
    public readonly cause?: unknown
  ) {
    super(message ?? code);
    this.name = "StoreError";
  }
}
