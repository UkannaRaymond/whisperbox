import { describe, expect, it } from "vitest";

import {
  loginFormSchema,
  registerFormSchema,
  usernameFormSchema,
} from "@/features/auth/schemas/auth-form.schema";

describe("registerFormSchema", () => {
  const valid = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "hunter22222",
    confirmPassword: "hunter22222",
  };

  it("accepts a valid registration payload", () => {
    expect(registerFormSchema.safeParse(valid).success).toBe(true);
  });

  it("does NOT accept a username field — that moved to the onboarding step", () => {
    // Regression guard for the specific refactor this schema went
    // through: username used to be collected here, making the register
    // form unusually long. Zod's default object parsing strips unknown
    // keys rather than rejecting them, so this asserts the *parsed*
    // output has no username, not that parsing fails.
    const result = registerFormSchema.safeParse({ ...valid, username: "ada_lovelace" });
    expect(result.success).toBe(true);
    expect(result.success && "username" in result.data).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = registerFormSchema.safeParse({ ...valid, confirmPassword: "somethingElse" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects a password under 8 characters", () => {
    const result = registerFormSchema.safeParse({
      ...valid,
      password: "short1",
      confirmPassword: "short1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerFormSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("loginFormSchema", () => {
  it("accepts a valid login payload", () => {
    expect(
      loginFormSchema.safeParse({ email: "ada@example.com", password: "anything" }).success,
    ).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(loginFormSchema.safeParse({ email: "ada@example.com", password: "" }).success).toBe(
      false,
    );
  });
});

describe("usernameFormSchema", () => {
  it("accepts a valid lowercase username", () => {
    expect(usernameFormSchema.safeParse({ username: "ada_lovelace" }).success).toBe(true);
  });

  it("rejects uppercase letters", () => {
    expect(usernameFormSchema.safeParse({ username: "AdaLovelace" }).success).toBe(false);
  });

  it("rejects a username under 3 characters", () => {
    expect(usernameFormSchema.safeParse({ username: "ab" }).success).toBe(false);
  });

  it("rejects a username over 24 characters", () => {
    expect(usernameFormSchema.safeParse({ username: "a".repeat(25) }).success).toBe(false);
  });

  it("rejects special characters", () => {
    expect(usernameFormSchema.safeParse({ username: "ada.lovelace" }).success).toBe(false);
  });
});
