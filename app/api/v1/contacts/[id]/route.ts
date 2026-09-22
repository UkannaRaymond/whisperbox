import type { NextRequest } from "next/server";
import { contactParamsSchema, updateContactSchema } from "@/schemas/contact.schema";
import { contactService } from "@/services";
import { requireUser } from "@/http/guards";
import { noContent, ok, withErrorHandling } from "@/http/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /v1/contacts/[id] — update nickname/notes/favorite/pinned for a
 * contact. `[id]` is the OTHER USER's id, not the Contact row's own id —
 * see contact.service.ts's doc comment.
 */
export const PATCH = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { userId } = await requireUser(request);
  const { id } = contactParamsSchema.parse(await params);
  const dto = updateContactSchema.parse(await request.json());
  const contact = await contactService.updateContact(userId, id, dto);
  return ok(contact);
});

/** DELETE /v1/contacts/[id] — remove a contact. */
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { userId } = await requireUser(request);
  const { id } = contactParamsSchema.parse(await params);
  await contactService.removeContact(userId, id);
  return noContent();
});
