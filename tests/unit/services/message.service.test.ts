import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  findByConversation,
  findByClientMessageId,
  findByIdForViewer,
  create,
  findById,
  update,
  editContent,
} = vi.hoisted(() => ({
  findByConversation: vi.fn(),
  findByClientMessageId: vi.fn(),
  findByIdForViewer: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  editContent: vi.fn(),
}));

const { findByConversationAndUser } = vi.hoisted(() => ({
  findByConversationAndUser: vi.fn(),
}));

vi.mock("@/repositories/prisma", () => ({
  repositories: {
    messages: {
      findByConversation,
      findByClientMessageId,
      findByIdForViewer,
      create,
      findById,
      update,
      editContent,
    },
    conversationMembers: { findByConversationAndUser },
  },
}));

import { listMessages, createMessage, updateMessage } from "@/services/message.service";

function fakeMessage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "message-1",
    conversationId: "conversation-1",
    senderId: "user-1",
    clientMessageId: "client-1",
    type: "TEXT",
    encryptedContent: "ciphertext",
    nonce: "nonce",
    encryptionVersion: 1,
    status: "SENT",
    sequenceNumber: 1n,
    replyToMessageId: null,
    pinned: false,
    edited: false,
    editedAt: null,
    deleted: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    encryptedKeyForMe: null as string | null,
    ...overrides,
  };
}

describe("listMessages", () => {
  beforeEach(() => vi.clearAllMocks());

  // Regression test for the actual reported bug: bubbles rendered
  // "Encrypted message" forever because encryptedKeyForMe never made it
  // onto the response at all.
  it("returns each message with the caller's own wrapped key", async () => {
    findByConversationAndUser.mockResolvedValue({ leftAt: null });
    findByConversation.mockResolvedValue([
      fakeMessage({ encryptedKeyForMe: "wrapped-key-for-viewer" }),
    ]);

    const result = await listMessages("user-1", "conversation-1", { take: 30 });

    expect(result[0]?.encryptedKeyForMe).toBe("wrapped-key-for-viewer");
    expect(findByConversation).toHaveBeenCalledWith("conversation-1", "user-1", { take: 30 });
  });

  it("passes null through when the caller has no wrapped key for a message", async () => {
    findByConversationAndUser.mockResolvedValue({ leftAt: null });
    findByConversation.mockResolvedValue([fakeMessage({ encryptedKeyForMe: null })]);

    const result = await listMessages("user-1", "conversation-1", { take: 30 });

    expect(result[0]?.encryptedKeyForMe).toBeNull();
  });
});

describe("createMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the sender's wrapped key from the created message", async () => {
    findByConversationAndUser.mockResolvedValue({ leftAt: null });
    findByClientMessageId.mockResolvedValue(null);
    create.mockResolvedValue(
      fakeMessage({
        encryptedKeyForMe: "wrapped-key-for-sender",
      }),
    );

    const result = await createMessage("user-1", {
      conversationId: "conversation-1",
      clientMessageId: "client-1",
      type: "TEXT",
      encryptedContent: "ciphertext",
      nonce: "nonce",
      encryptionVersion: 1,
      encryptedKeys: [
        {
          recipientId: "user-1",
          encryptedKey: "wrapped-key-for-sender",
        },
      ],
    });

    expect(findByIdForViewer).not.toHaveBeenCalled();
    expect(result.encryptedKeyForMe).toBe("wrapped-key-for-sender");
  });
  it("an idempotent retry (existing clientMessageId) still returns the viewer's wrapped key, not the bare row", async () => {
    findByConversationAndUser.mockResolvedValue({ leftAt: null });
    findByClientMessageId.mockResolvedValue(fakeMessage());
    findByIdForViewer.mockResolvedValue(
      fakeMessage({ encryptedKeyForMe: "wrapped-key-for-sender" }),
    );

    const result = await createMessage("user-1", {
      conversationId: "conversation-1",
      clientMessageId: "client-1",
      type: "TEXT",
      encryptedContent: "ciphertext",
      nonce: "nonce",
      encryptionVersion: 1,
      encryptedKeys: [{ recipientId: "user-1", encryptedKey: "wrapped-key" }],
    });

    expect(create).not.toHaveBeenCalled();
    expect(result.encryptedKeyForMe).toBe("wrapped-key-for-sender");
  });
});

describe("updateMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  // The other half of the regression: without this re-fetch, editing or
  // pinning a message would overwrite the client's cached copy with
  // encryptedKeyForMe: null, silently re-locking an already-readable
  // message (LocalMessage IS MessageResponseDto — see
  // features/offline/types/offline.types.ts).
  it("re-fetches viewer-aware after editing content, preserving the wrapped key", async () => {
    findById.mockResolvedValue(fakeMessage({ senderId: "user-1" }));
    findByConversationAndUser.mockResolvedValue({ leftAt: null });
    editContent.mockResolvedValue(fakeMessage({ edited: true }));
    findByIdForViewer.mockResolvedValue(
      fakeMessage({ edited: true, encryptedKeyForMe: "wrapped-key-for-viewer" }),
    );

    const result = await updateMessage("user-1", "message-1", {
      encryptedContent: "new-ciphertext",
      nonce: "new-nonce",
    });

    expect(result.encryptedKeyForMe).toBe("wrapped-key-for-viewer");
    expect(result.edited).toBe(true);
  });

  it("re-fetches viewer-aware after a pin toggle too", async () => {
    findById.mockResolvedValue(fakeMessage());
    findByConversationAndUser.mockResolvedValue({ leftAt: null });
    update.mockResolvedValue(fakeMessage({ pinned: true }));
    findByIdForViewer.mockResolvedValue(
      fakeMessage({ pinned: true, encryptedKeyForMe: "wrapped-key-for-viewer" }),
    );

    const result = await updateMessage("user-1", "message-1", { pinned: true });

    expect(result.encryptedKeyForMe).toBe("wrapped-key-for-viewer");
    expect(result.pinned).toBe(true);
  });
});
