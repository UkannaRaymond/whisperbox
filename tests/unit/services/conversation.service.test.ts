import { describe, expect, it, vi, beforeEach } from "vitest";

const { findByConversationAndUser, findAllForConversation, findByIdForViewer, setPinned } =
  vi.hoisted(() => ({
    findByConversationAndUser: vi.fn(),
    findAllForConversation: vi.fn(),
    findByIdForViewer: vi.fn(),
    setPinned: vi.fn(),
  }));

vi.mock("@/repositories/prisma", () => ({
  repositories: {
    conversationMembers: { findByConversationAndUser, findAllForConversation },
    conversations: { findByIdForViewer, setPinned },
  },
}));

import {
  listMembers,
  getConversation,
  setConversationPinned,
} from "@/services/conversation.service";
import { ForbiddenError, NotFoundError } from "@/errors";

describe("listMembers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the conversation's active members when the caller is one of them", async () => {
    findByConversationAndUser.mockResolvedValue({ leftAt: null });
    findAllForConversation.mockResolvedValue([
      { userId: "user-1", role: "OWNER", joinedAt: new Date("2026-01-01T00:00:00.000Z") },
      { userId: "user-2", role: "MEMBER", joinedAt: new Date("2026-01-02T00:00:00.000Z") },
    ]);

    const result = await listMembers("user-1", "conversation-1");

    expect(result).toEqual([
      { userId: "user-1", role: "OWNER", joinedAt: "2026-01-01T00:00:00.000Z" },
      { userId: "user-2", role: "MEMBER", joinedAt: "2026-01-02T00:00:00.000Z" },
    ]);
  });

  // This is the exact scenario behind the "You are not a member of this
  // conversation" runtime error the offline sync engine hit: a caller
  // (or a stale local cache) referencing a conversation id they're not
  // — or no longer — an active member of.
  it("throws ForbiddenError when the caller has never been a member", async () => {
    findByConversationAndUser.mockResolvedValue(null);

    await expect(listMembers("outsider", "conversation-1")).rejects.toThrow(ForbiddenError);
    expect(findAllForConversation).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError when the caller left the conversation", async () => {
    findByConversationAndUser.mockResolvedValue({ leftAt: new Date("2026-01-03T00:00:00.000Z") });

    await expect(listMembers("former-member", "conversation-1")).rejects.toThrow(ForbiddenError);
    expect(findAllForConversation).not.toHaveBeenCalled();
  });
});

function fakeConversation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "conversation-1",
    type: "DIRECT",
    visibility: "PRIVATE",
    name: null,
    description: null,
    avatar: null,
    createdById: "user-1",
    archived: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    pinned: false,
    unreadCount: 0,
    lastMessage: null,
    otherMember: null,
    ...overrides,
  };
}

describe("getConversation", () => {
  beforeEach(() => vi.clearAllMocks());

  // Regression coverage for the screenshot bug: every DIRECT conversation
  // rendered as generic "Direct message" / "Offline" because nothing
  // resolved who the other person actually was. This asserts the viewer
  // context (otherMember/pinned/unreadCount/lastMessage) makes it all the
  // way through the service layer onto the response.
  it("returns the conversation enriched with viewer context", async () => {
    findByConversationAndUser.mockResolvedValue({ leftAt: null });
    findByIdForViewer.mockResolvedValue(
      fakeConversation({
        otherMember: {
          userId: "user-2",
          username: "jordan",
          displayName: "Jordan Hayes",
          avatarUrl: null,
        },
        pinned: true,
        unreadCount: 3,
      }),
    );

    const result = await getConversation("user-1", "conversation-1");

    expect(result.otherMember).toEqual({
      userId: "user-2",
      username: "jordan",
      displayName: "Jordan Hayes",
      avatarUrl: null,
    });
    expect(result.pinned).toBe(true);
    expect(result.unreadCount).toBe(3);
    expect(findByIdForViewer).toHaveBeenCalledWith("conversation-1", "user-1");
  });

  it("throws ForbiddenError for a non-member before even querying the conversation", async () => {
    findByConversationAndUser.mockResolvedValue(null);

    await expect(getConversation("outsider", "conversation-1")).rejects.toThrow(ForbiddenError);
    expect(findByIdForViewer).not.toHaveBeenCalled();
  });

  it("throws NotFoundError if the conversation doesn't exist", async () => {
    findByConversationAndUser.mockResolvedValue({ leftAt: null });
    findByIdForViewer.mockResolvedValue(null);

    await expect(getConversation("user-1", "missing")).rejects.toThrow(NotFoundError);
  });
});

describe("setConversationPinned", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pins a conversation for the caller only", async () => {
    findByConversationAndUser.mockResolvedValue({ leftAt: null });

    await setConversationPinned("user-1", "conversation-1", true);

    expect(setPinned).toHaveBeenCalledWith("conversation-1", "user-1", true);
  });

  it("refuses to pin a conversation the caller isn't a member of", async () => {
    findByConversationAndUser.mockResolvedValue(null);

    await expect(setConversationPinned("outsider", "conversation-1", true)).rejects.toThrow(
      ForbiddenError,
    );
    expect(setPinned).not.toHaveBeenCalled();
  });
});
