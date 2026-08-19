import { apiFetch } from "@/lib/api-client";
import * as CryptoService from "@/features/encryption/services/crypto.service";
import type { ConversationMemberResponseDto } from "@/schemas/conversation.schema";
import type { RecipientDeviceKeyDto } from "@/schemas/device.schema";

/**
 * Resolves the public keys a message needs to be encrypted against before
 * it can be sent (features/encryption/services/crypto.service.ts
 * #encryptForRecipients).
 *
 * This used to be a documented, permanent blocker: there was no
 * `GET /v1/conversations/{id}/members` endpoint and no `/v1/devices`
 * endpoint anywhere in the app, so there was no way to find out who a
 * message needed to be encrypted for, or what their key was. Both now
 * exist (app/api/v1/conversations/[id]/members/route.ts,
 * app/api/v1/devices/keys/route.ts) — this resolves the caller's fellow
 * conversation members, looks up each one's most-recently-active device
 * key, and imports it as a `CryptoKey`.
 */
export async function resolveRecipientKeys(
  conversationId: string,
): Promise<Array<{ recipientId: string; publicKey: CryptoKey }>> {
  const members = await apiFetch<ConversationMemberResponseDto[]>(
    `/api/v1/conversations/${conversationId}/members`,
  );

  if (members.length === 0) {
    throw new Error(`Conversation ${conversationId} has no members to encrypt this message for.`);
  }

  const userIds = members.map((member) => member.userId);
  const keys = await apiFetch<RecipientDeviceKeyDto[]>(
    `/api/v1/devices/keys?userIds=${userIds.map(encodeURIComponent).join(",")}`,
  );

  const missing = userIds.filter((userId) => !keys.some((key) => key.userId === userId));
  if (missing.length > 0) {
    throw new Error(
      `Cannot encrypt this message: ${missing.length} conversation member(s) have no registered device key yet ` +
        `(userId(s): ${missing.join(", ")}). They need to open WhisperBox at least once on a device before they can receive encrypted messages.`,
    );
  }

  return Promise.all(
    keys.map(async (key) => ({
      recipientId: key.userId,
      publicKey: await CryptoService.importPublicKey(key.devicePublicKey),
    })),
  );
}
