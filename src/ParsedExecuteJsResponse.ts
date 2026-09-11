import type { ExecuteJsError } from "@sitnikov/browser-automation";

export interface ParsedExecuteJsSuccess<T> {
  success: true;
  result: T;
}

export type ParsedExecuteJsResponse<T> = ParsedExecuteJsSuccess<T> | ExecuteJsError;
