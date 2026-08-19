import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { requireUser, getConversation, listMembers, setConversationPinned } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getConversation: vi.fn(),
  listMembers: vi.fn(),
  setConversationPinned: vi.fn(),
}));

vi.mock("@/http/guards", () => ({ requireUser }));
vi.mock("@/services", () => ({
  conversationService: { getConversation, listMembers, setConversationPinned },
}));

import {
  GET as getConversationRoute,
  PATCH as patchConversationRoute,
} from "@/app/api/v1/conversations/[id]/route";
import { GET as getMembersRoute } from "@/app/api/v1/conversations/[id]/members/route";
import { ForbiddenError, UnauthorizedError } from "@/errors";

function makeRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function makePatchRequest(path: string, body: unknown) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/v1/conversations/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  // Regression test for the exact bug reported: this route didn't exist
  // at all, so useConversation() never resolved and the message composer
  // never rendered. This asserts the route now exists, is wired to
  // conversationService.getConversation, and returns the standard
  // success envelope.
  it("returns the conversation for an authenticated member", async () => {
    requireUser.mockResolvedValue({ userId: "user-1" });
    getConversation.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      type: "DIRECT",
    });

    const response = await getConversationRoute(
      makeRequest("/api/v1/conversations/11111111-1111-4111-8111-111111111111"),
      {
        params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: { id: "11111111-1111-4111-8111-111111111111", type: "DIRECT" },
    });
    expect(getConversation).toHaveBeenCalledWith("user-1", "11111111-1111-4111-8111-111111111111");
  });

  it("returns 401 when there is no session", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());

    const response = await getConversationRoute(
      makeRequest("/api/v1/conversations/11111111-1111-4111-8111-111111111111"),
      {
        params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
      },
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when the caller is not a member of the conversation", async () => {
    requireUser.mockResolvedValue({ userId: "outsider" });
    getConversation.mockRejectedValue(
      new ForbiddenError("You are not a member of this conversation"),
    );

    const response = await getConversationRoute(
      makeRequest("/api/v1/conversations/11111111-1111-4111-8111-111111111111"),
      {
        params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
      },
    );

    expect(response.status).toBe(403);
  });
});

describe("GET /api/v1/conversations/[id]/members", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the conversation's members for an authenticated member", async () => {
    requireUser.mockResolvedValue({ userId: "user-1" });
    listMembers.mockResolvedValue([
      { userId: "user-1", role: "OWNER", joinedAt: "2026-01-01T00:00:00.000Z" },
    ]);

    const response = await getMembersRoute(
      makeRequest("/api/v1/conversations/11111111-1111-4111-8111-111111111111/members"),
      {
        params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(listMembers).toHaveBeenCalledWith("user-1", "11111111-1111-4111-8111-111111111111");
  });
});

describe("PATCH /api/v1/conversations/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pins a conversation for the caller", async () => {
    requireUser.mockResolvedValue({ userId: "user-1" });
    setConversationPinned.mockResolvedValue(undefined);

    const response = await patchConversationRoute(
      makePatchRequest("/api/v1/conversations/11111111-1111-4111-8111-111111111111", {
        pinned: true,
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(204);
    expect(setConversationPinned).toHaveBeenCalledWith(
      "user-1",
      "11111111-1111-4111-8111-111111111111",
      true,
    );
  });

  it("rejects a payload missing the pinned field", async () => {
    requireUser.mockResolvedValue({ userId: "user-1" });

    const response = await patchConversationRoute(
      makePatchRequest("/api/v1/conversations/11111111-1111-4111-8111-111111111111", {}),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(400);
    expect(setConversationPinned).not.toHaveBeenCalled();
  });
});
