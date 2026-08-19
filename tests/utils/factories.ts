import type { UserResponseDto } from "@/schemas/user.schema";
import type {
  ConversationResponseDto,
  ConversationMemberResponseDto,
} from "@/schemas/conversation.schema";
import type { RecipientDeviceKeyDto, DeviceResponseDto } from "@/schemas/device.schema";
import type { MessageResponseDto } from "@/schemas/message.schema";

/**
 * Builders for the DTOs the API actually returns (Zod-inferred types, so
 * these can't silently drift from the real response shape). Each takes a
 * `Partial<...>` of overrides — tests only specify the fields they care
 * about, everything else gets a valid, boring default.
 */

let idCounter = 0;
/** Deterministic per-test-run ids, readable in failure output (unlike a real uuid). */
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function buildUser(overrides: Partial<UserResponseDto> = {}): UserResponseDto {
  const id = overrides.id ?? nextId("user");
  return {
    id,
    email: `${id}@example.com`,
    username: `user_${id}`,
    displayName: null,
    avatarUrl: null,
    bio: null,
    status: "ONLINE",
    lastSeenAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

export function buildConversation(
  overrides: Partial<ConversationResponseDto> = {},
): ConversationResponseDto {
  return {
    id: nextId("conversation"),
    type: "DIRECT",
    visibility: "PRIVATE",
    name: null,
    description: null,
    avatar: null,
    createdById: nextId("user"),
    archived: false,
    pinned: false,
    unreadCount: 0,
    lastMessage: null,
    otherMember: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

export function buildConversationMember(
  overrides: Partial<ConversationMemberResponseDto> = {},
): ConversationMemberResponseDto {
  return {
    userId: nextId("user"),
    role: "MEMBER",
    joinedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

export function buildRecipientDeviceKey(
  overrides: Partial<RecipientDeviceKeyDto> = {},
): RecipientDeviceKeyDto {
  return {
    userId: nextId("user"),
    deviceId: nextId("device"),
    devicePublicKey: "base64-spki-public-key",
    fingerprint: "aa:bb:cc:dd",
    ...overrides,
  };
}

export function buildDevice(overrides: Partial<DeviceResponseDto> = {}): DeviceResponseDto {
  const id = overrides.id ?? nextId("device");
  return {
    id,
    userId: nextId("user"),
    name: "Test device",
    platform: "WEB",
    devicePublicKey: "base64-spki-public-key",
    fingerprint: "aa:bb:cc:dd",
    trusted: true,
    lastSeenAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

export function buildMessage(overrides: Partial<MessageResponseDto> = {}): MessageResponseDto {
  return {
    id: nextId("message"),
    conversationId: nextId("conversation"),
    senderId: nextId("user"),
    clientMessageId: nextId("client-msg"),
    type: "TEXT",
    encryptedContent: "ciphertext",
    nonce: "nonce",
    encryptionVersion: 1,
    status: "SENT",
    sequenceNumber: "1",
    replyToMessageId: null,
    pinned: false,
    encryptedKeyForMe: "wrapped-content-key",
    edited: false,
    editedAt: null,
    deleted: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}
