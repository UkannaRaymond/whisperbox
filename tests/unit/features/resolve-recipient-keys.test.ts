import { describe, expect, it, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../mocks/server";
import { buildConversationMember, buildRecipientDeviceKey } from "../../utils/factories";

// `crypto.subtle.importKey` needs real WebCrypto support, which jsdom
// doesn't provide — mocked here so this test exercises resolveRecipientKeys'
// own orchestration logic (which members? which keys? what's missing?)
// without depending on the test environment's WebCrypto support. Real
// import behavior is crypto.service's own concern, not this file's.
vi.mock("@/features/encryption/services/crypto.service", () => ({
  importPublicKey: vi.fn(
    async (spki: string) => ({ __mockPublicKey: spki }) as unknown as CryptoKey,
  ),
}));

import { resolveRecipientKeys } from "@/features/chat/utils/resolve-recipient-keys";
import * as CryptoService from "@/features/encryption/services/crypto.service";

describe("resolveRecipientKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves every conversation member's device key", async () => {
    const memberA = buildConversationMember({ userId: "user-a" });
    const memberB = buildConversationMember({ userId: "user-b" });

    server.use(
      http.get("/api/v1/conversations/:id/members", () =>
        HttpResponse.json({ success: true, data: [memberA, memberB] }),
      ),
      http.get("/api/v1/devices/keys", ({ request }) => {
        const userIds = new URL(request.url).searchParams.get("userIds")?.split(",") ?? [];
        return HttpResponse.json({
          success: true,
          data: userIds.map((userId) =>
            buildRecipientDeviceKey({ userId, devicePublicKey: `key-${userId}` }),
          ),
        });
      }),
    );

    const result = await resolveRecipientKeys("conversation-1");

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.recipientId).sort()).toEqual(["user-a", "user-b"]);
    expect(CryptoService.importPublicKey).toHaveBeenCalledTimes(2);
    expect(CryptoService.importPublicKey).toHaveBeenCalledWith("key-user-a");
  });

  it("throws a clear error when the conversation has no members", async () => {
    server.use(
      http.get("/api/v1/conversations/:id/members", () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
    );

    await expect(resolveRecipientKeys("empty-conversation")).rejects.toThrow(/no members/i);
  });

  it("throws a clear error listing members with no registered device key", async () => {
    const memberWithKey = buildConversationMember({ userId: "user-with-key" });
    const memberWithoutKey = buildConversationMember({ userId: "user-without-key" });

    server.use(
      http.get("/api/v1/conversations/:id/members", () =>
        HttpResponse.json({ success: true, data: [memberWithKey, memberWithoutKey] }),
      ),
      // Only returns a key for one of the two requested users — simulates
      // a member who has never opened the app on any device.
      http.get("/api/v1/devices/keys", () =>
        HttpResponse.json({
          success: true,
          data: [buildRecipientDeviceKey({ userId: "user-with-key" })],
        }),
      ),
    );

    await expect(resolveRecipientKeys("conversation-1")).rejects.toThrow(/user-without-key/);
  });
});
