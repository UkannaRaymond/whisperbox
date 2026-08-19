import { describe, expect, it } from "vitest";

import {
  registerDeviceSchema,
  lookupDeviceKeysQuerySchema,
  recipientDeviceKeySchema,
} from "@/schemas/device.schema";

describe("registerDeviceSchema", () => {
  const valid = {
    name: "My laptop",
    platform: "MACOS",
    devicePublicKey: "base64-spki",
    fingerprint: "aa:bb:cc",
    deviceIdentifier: "device-uuid-1",
  };

  it("accepts a valid device registration payload", () => {
    expect(registerDeviceSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unknown platform", () => {
    const result = registerDeviceSchema.safeParse({ ...valid, platform: "PLAYSTATION" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty devicePublicKey", () => {
    const result = registerDeviceSchema.safeParse({ ...valid, devicePublicKey: "" });
    expect(result.success).toBe(false);
  });

  it("allows optional appVersion/osVersion to be omitted", () => {
    const result = registerDeviceSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe("lookupDeviceKeysQuerySchema", () => {
  it("splits a comma-separated userIds query param into an array", () => {
    const result = lookupDeviceKeysQuerySchema.parse({ userIds: "a,b,c" });
    expect(result.userIds).toEqual(["a", "b", "c"]);
  });

  it("trims whitespace and drops empty entries", () => {
    const result = lookupDeviceKeysQuerySchema.parse({ userIds: "a, b ,,c" });
    expect(result.userIds).toEqual(["a", "b", "c"]);
  });

  it("rejects a missing userIds param", () => {
    expect(lookupDeviceKeysQuerySchema.safeParse({}).success).toBe(false);
  });

  it("rejects an empty userIds string", () => {
    expect(lookupDeviceKeysQuerySchema.safeParse({ userIds: "" }).success).toBe(false);
  });

  it("rejects a string that is only commas (resolves to zero ids)", () => {
    expect(lookupDeviceKeysQuerySchema.safeParse({ userIds: ",,," }).success).toBe(false);
  });
});

describe("recipientDeviceKeySchema", () => {
  it("accepts a well-formed recipient device key", () => {
    const result = recipientDeviceKeySchema.safeParse({
      userId: "user-1",
      deviceId: "5b1a2e2e-6b1a-4b1a-8b1a-2e2e6b1a4b1a",
      devicePublicKey: "base64-spki",
      fingerprint: "aa:bb:cc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid deviceId", () => {
    const result = recipientDeviceKeySchema.safeParse({
      userId: "user-1",
      deviceId: "not-a-uuid",
      devicePublicKey: "base64-spki",
      fingerprint: "aa:bb:cc",
    });
    expect(result.success).toBe(false);
  });
});
