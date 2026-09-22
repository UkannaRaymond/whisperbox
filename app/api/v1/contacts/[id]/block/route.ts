import type { NextRequest } from "next/server";
import { contactParamsSchema } from "@/schemas/contact.schema";
import { contactService } from "@/services";
import { requireUser } from "@/http/guards";
import { ok, withErrorHandling } from "@/http/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** PUT /v1/contacts/[id]/block — block a user (creates the contact row first if one doesn't exist yet). */
export const PUT = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { userId } = await requireUser(request);
  const { id } = contactParamsSchema.parse(await params);
  const contact = await contactService.blockContact(userId, id);
  return ok(contact);
});

/** DELETE /v1/contacts/[id]/block — unblock a user. */
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { userId } = await requireUser(request);
  const { id } = contactParamsSchema.parse(await params);
  const contact = await contactService.unblockContact(userId, id);
  return ok(contact);
});
