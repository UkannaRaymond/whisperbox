/**
 * Base class for all typed application errors. Services and repositories
 * throw these (never a bare `Error` or a string) so the API layer can map
 * them to a stable `code` in the response envelope instead of leaking an
 * implementation detail or stack trace.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;
}

export class AuthenticationError extends AppError {
  readonly code = "AUTHENTICATION_ERROR";
  readonly statusCode = 401;
}

export class AuthorizationError extends AppError {
  readonly code = "AUTHORIZATION_ERROR";
  readonly statusCode = 403;
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly statusCode = 404;
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT";
  readonly statusCode = 409;
}

/**
 * Narrows an unknown thrown value to an `AppError`, so callers can branch
 * on `.code`/`.statusCode` without an `instanceof` chain at every call
 * site.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
