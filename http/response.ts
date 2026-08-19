import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, RateLimitError } from "../errors";

/**
 * Standard success envelope. "Error Format" implies a matching
 * success shape: { success, data }.
 */
export function ok<T>(data: T, init?: { status?: number }): NextResponse {
  return NextResponse.json({ success: true, data }, { status: init?.status ?? 200 });
}

export function created<T>(data: T): NextResponse {
  return ok(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  const body: ApiErrorBody = {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
  return NextResponse.json(body, { status });
}

/** Maps AppError subclasses (and Zod validation errors) to HTTP status codes. */
const ERROR_STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  ACCOUNT_LOCKED: 423,
  RATE_LIMITED: 429,
};

/**
 * Central error handler for route handlers. Wrap every handler body in
 * try/catch and call this in the catch block, or use `withErrorHandling`.
 * Never leaks stack traces
 */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Request validation failed",
      400,
      err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }

  if (err instanceof AppError) {
    const status = ERROR_STATUS_BY_CODE[err.code] ?? 400;
    const response = errorResponse(err.code, err.message, status);
    if (err instanceof RateLimitError && err.retryAfterSeconds !== undefined) {
      response.headers.set("Retry-After", String(err.retryAfterSeconds));
    }
    return response;
  }

  // Unknown/unexpected error — log server-side, never expose details to the client.
  console.error("Unhandled route error:", err);
  return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
}

type Handler<TArgs extends unknown[]> = (...args: TArgs) => Promise<NextResponse>;

/** Wraps a route handler so any thrown error is converted to the standard error envelope. */
export function withErrorHandling<TArgs extends unknown[]>(
  handler: Handler<TArgs>,
): Handler<TArgs> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
