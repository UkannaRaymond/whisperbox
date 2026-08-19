import { describe, expect, it } from "vitest";

import { isApiError, type ApiResult } from "@/types/api";

describe("api response envelope", () => {
  it("identifies a success envelope", () => {
    const result: ApiResult<{ id: string }> = { success: true, data: { id: "1" } };
    expect(isApiError(result)).toBe(false);
  });

  it("identifies an error envelope", () => {
    const result: ApiResult<{ id: string }> = {
      success: false,
      error: { code: "NOT_FOUND", message: "Resource not found" },
    };
    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.error).toEqual({ code: "NOT_FOUND", message: "Resource not found" });
    }
  });
});
