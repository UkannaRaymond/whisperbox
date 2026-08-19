import { describe, expect, it } from "vitest";

import { ValidationError, AuthenticationError, NotFoundError, isAppError } from "@/lib/errors";

describe("AppError hierarchy", () => {
  it("assigns the correct code and status per subclass", () => {
    expect(new ValidationError("bad input").code).toBe("VALIDATION_ERROR");
    expect(new AuthenticationError("nope").statusCode).toBe(401);
    expect(new NotFoundError("missing").code).toBe("NOT_FOUND");
  });

  it("is narrowed correctly by isAppError", () => {
    expect(isAppError(new NotFoundError("missing"))).toBe(true);
    expect(isAppError(new Error("plain error"))).toBe(false);
    expect(isAppError("not an error")).toBe(false);
  });
});
