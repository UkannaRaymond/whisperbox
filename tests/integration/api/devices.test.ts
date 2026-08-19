import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { requireUser, registerDevice, listOwnDevices, lookupRecipientDeviceKeys } = vi.hoisted(
  () => ({
    requireUser: vi.fn(),
    registerDevice: vi.fn(),
    listOwnDevices: vi.fn(),
    lookupRecipientDeviceKeys: vi.fn(),
  }),
);

vi.mock("@/http/guards", () => ({ requireUser }));
vi.mock("@/services", () => ({
  deviceService: { registerDevice, listOwnDevices, lookupRecipientDeviceKeys },
}));

import { GET as listDevicesRoute, POST as registerDeviceRoute } from "@/app/api/v1/devices/route";
import { GET as lookupKeysRoute } from "@/app/api/v1/devices/keys/route";

function makeGetRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function makePostRequest(path: string, body: unknown) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/v1/devices", () => {
  beforeEach(() => vi.clearAllMocks());
  it("registers a device and returns 201", async () => {
    requireUser.mockResolvedValue({ userId: "user-1" });
    registerDevice.mockResolvedValue({ id: "device-1", userId: "user-1" });

    const response = await registerDeviceRoute(
      makePostRequest("/api/v1/devices", {
        name: "My laptop",
        platform: "MACOS",
        devicePublicKey: "spki-key",
        fingerprint: "aa:bb",
        deviceIdentifier: "install-1",
      }),
    );

    expect(response.status).toBe(201);
    expect(registerDevice).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ devicePublicKey: "spki-key" }),
    );
  });

  it("returns 400 for an invalid payload", async () => {
    requireUser.mockResolvedValue({ userId: "user-1" });

    const response = await registerDeviceRoute(makePostRequest("/api/v1/devices", { name: "" }));

    expect(response.status).toBe(400);
    expect(registerDevice).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/devices", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the caller's own devices", async () => {
    requireUser.mockResolvedValue({ userId: "user-1" });
    listOwnDevices.mockResolvedValue([{ id: "device-1" }]);

    const response = await listDevicesRoute(makeGetRequest("/api/v1/devices"));

    expect(response.status).toBe(200);
    expect(listOwnDevices).toHaveBeenCalledWith("user-1");
  });
});

describe("GET /api/v1/devices/keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("looks up device keys for the requested userIds", async () => {
    requireUser.mockResolvedValue({ userId: "user-1" });
    lookupRecipientDeviceKeys.mockResolvedValue([{ userId: "user-2", devicePublicKey: "key" }]);

    const response = await lookupKeysRoute(
      makeGetRequest("/api/v1/devices/keys?userIds=user-2,user-3"),
    );

    expect(response.status).toBe(200);
    expect(lookupRecipientDeviceKeys).toHaveBeenCalledWith(["user-2", "user-3"]);
  });

  it("returns 400 when userIds is missing", async () => {
    requireUser.mockResolvedValue({ userId: "user-1" });

    const response = await lookupKeysRoute(makeGetRequest("/api/v1/devices/keys"));

    expect(response.status).toBe(400);
    expect(lookupRecipientDeviceKeys).not.toHaveBeenCalled();
  });
});
