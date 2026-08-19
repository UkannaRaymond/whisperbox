import { describe, expect, it, vi, beforeEach } from "vitest";

const { findByUserId, findOrCreate } = vi.hoisted(() => ({
  findByUserId: vi.fn(),
  findOrCreate: vi.fn(),
}));

vi.mock("@/repositories/prisma", () => ({
  repositories: {
    devices: { findByUserId, findOrCreate },
  },
}));

import {
  registerDevice,
  listOwnDevices,
  lookupRecipientDeviceKeys,
} from "@/services/device.service";

function fakeDevice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "device-1",
    userId: "user-1",
    name: "Test device",
    platform: "WEB",
    devicePublicKey: "spki-key",
    fingerprint: "aa:bb",
    trusted: true,
    lastSeenAt: new Date("2026-01-02T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("registerDevice", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates to repositories.devices.findOrCreate and serializes dates", async () => {
    findOrCreate.mockResolvedValue(fakeDevice());

    const result = await registerDevice("user-1", {
      name: "Test device",
      platform: "WEB",
      devicePublicKey: "spki-key",
      fingerprint: "aa:bb",
      deviceIdentifier: "install-1",
    });

    expect(findOrCreate).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Test device",
      platform: "WEB",
      devicePublicKey: "spki-key",
      fingerprint: "aa:bb",
      deviceIdentifier: "install-1",
    });
    expect(result.lastSeenAt).toBe("2026-01-02T00:00:00.000Z");
  });
});

describe("listOwnDevices", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the caller's devices serialized for the API", async () => {
    findByUserId.mockResolvedValue([fakeDevice(), fakeDevice({ id: "device-2" })]);

    const result = await listOwnDevices("user-1");

    expect(findByUserId).toHaveBeenCalledWith("user-1");
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("device-1");
  });
});

describe("lookupRecipientDeviceKeys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns one key per user, picking the most recently active device", async () => {
    findByUserId.mockImplementation(async (userId: string) => {
      if (userId !== "user-1") return [];
      return [
        fakeDevice({ id: "old-device", lastSeenAt: new Date("2026-01-01T00:00:00.000Z") }),
        fakeDevice({ id: "new-device", lastSeenAt: new Date("2026-01-05T00:00:00.000Z") }),
      ];
    });

    const result = await lookupRecipientDeviceKeys(["user-1"]);

    expect(result).toHaveLength(1);
    expect(result[0]?.deviceId).toBe("new-device");
  });

  it("omits users with no active device rather than erroring", async () => {
    findByUserId.mockImplementation(async (userId: string) =>
      userId === "user-with-device" ? [fakeDevice()] : [],
    );

    const result = await lookupRecipientDeviceKeys(["user-with-device", "user-without-device"]);

    expect(result).toHaveLength(1);
    expect(result[0]?.userId).toBe("user-with-device");
  });

  it("de-duplicates repeated userIds before querying", async () => {
    findByUserId.mockResolvedValue([fakeDevice()]);

    await lookupRecipientDeviceKeys(["user-1", "user-1", "user-1"]);

    expect(findByUserId).toHaveBeenCalledTimes(1);
  });
});
