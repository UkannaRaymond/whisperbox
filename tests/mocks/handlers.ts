import { http, HttpResponse } from "msw";
import {
  buildConversation,
  buildConversationMember,
  buildRecipientDeviceKey,
  buildUser,
} from "../utils/factories";

export const handlers = [
  http.get("/api/v1/users/me", () => {
    return HttpResponse.json({ success: true, data: buildUser() });
  }),

  http.get("/api/v1/conversations/:id", ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: buildConversation({ id: params.id as string }),
    });
  }),

  http.get("/api/v1/conversations/:id/members", () => {
    return HttpResponse.json({
      success: true,
      data: [buildConversationMember(), buildConversationMember()],
    });
  }),

  http.get("/api/v1/devices/keys", ({ request }) => {
    const url = new URL(request.url);
    const userIds = (url.searchParams.get("userIds") ?? "").split(",").filter(Boolean);
    return HttpResponse.json({
      success: true,
      data: userIds.map((userId) => buildRecipientDeviceKey({ userId })),
    });
  }),

  http.post("/api/v1/devices", async () => {
    return HttpResponse.json({ success: true, data: buildRecipientDeviceKey() }, { status: 201 });
  }),

  http.post("/api/v1/users/me/profile", async () => {
    return HttpResponse.json({ success: true, data: buildUser() }, { status: 201 });
  }),
];
