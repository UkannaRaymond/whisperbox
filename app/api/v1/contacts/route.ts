import type { NextRequest } from "next/server";
import { addContactSchema, listContactsQuerySchema } from "@/schemas/contact.schema";
import { contactService } from "@/services";
import { requireUser } from "@/http/guards";
import { created, ok, withErrorHandling } from "@/http/response";

/** GET /v1/contacts — the caller's contacts, optionally filtered to blocked/unblocked. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const query = listContactsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const contacts = await contactService.listContacts(userId, query);
  return ok(contacts);
});

/** POST /v1/contacts — add a contact by username or email handle. */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const body = await request.json();
  const dto = addContactSchema.parse(body);
  const contact = await contactService.addContact(userId, dto);
  return created(contact);
});
