/**
 * Standard API response envelope.
 *
 * Matches the actual shape produced by `http/response.ts` — a nested
 * `error: { code, message, details? }` object, not a flat `error: true`
 * boolean alongside top-level `code`/`message` fields.
 */
export type ApiSuccess<TData> = {
  success: true;
  data: TData;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiError = {
  success: false;
  error: ApiErrorBody;
};

export type ApiResult<TData> = ApiSuccess<TData> | ApiError;

export function isApiError<TData>(result: ApiResult<TData>): result is ApiError {
  return result.success === false;
}
