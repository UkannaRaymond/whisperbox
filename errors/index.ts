/**
 * Typed error hierarchy shared by every repository implementation.
 * (Matches SDD section 10 — services/repositories throw typed errors that
 * the application layer later converts into the standard API response.)
 */

export class AppError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id "${id}" was not found` : `${resource} was not found`,
      "NOT_FOUND",
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action") {
    super(message, "FORBIDDEN");
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string = "Too many requests, please try again later",
    retryAfterSeconds?: number,
  ) {
    super(message, "RATE_LIMITED");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class AccountLockedError extends AppError {
  constructor(
    message: string = "Account is temporarily locked due to repeated failed login attempts",
  ) {
    super(message, "ACCOUNT_LOCKED");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}
