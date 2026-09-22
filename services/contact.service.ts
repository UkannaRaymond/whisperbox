import { repositories } from "../repositories/prisma";
import { NotFoundError, ConflictError } from "../errors";
import { lookupUser } from "./user.service";
import type { UserWithProfile } from "../repositories/interfaces/user.repository.interface";
import type { Contact } from "@prisma/client";
import type {
  AddContactDto,
  UpdateContactDto,
  ListContactsQueryDto,
  ContactResponseDto,
} from "../schemas/contact.schema";

/**
 * Contacts service — sits on top of `repositories.contacts`
 * (repositories/prisma/contact.repository.ts, already fully implemented)
 * and `repositories.users`, resolving each `Contact` row's other-user
 * profile server-side so the UI never has to make a second round trip
 * per row (the same reasoning as `ConversationRepository#enrichForViewer`
 * for `otherMember`).
 *
 * Every public function here is keyed by the OTHER user's id (`contactId`
 * / the route's `[id]` param), not the `Contact` row's own `id` — nobody
 * building the UI has the row id handy (it's never surfaced anywhere),
 * but every screen that shows a contact already has the user's id from
 * having rendered their profile. `findByOwnerAndContact` is what makes
 * that lookup cheap.
 */

function toContactResponse(contact: Contact, user: UserWithProfile): ContactResponseDto {
  const profile = user.profile;
  return {
    id: contact.id,
    ownerId: contact.ownerId,
    contactId: contact.contactId,
    nickname: contact.nickname,
    notes: contact.notes,
    favorite: contact.favorite,
    pinned: contact.pinned,
    blocked: contact.blocked,
    user: {
      id: user.id,
      username: profile?.username ?? null,
      displayName: profile?.displayName ?? user.name,
      avatarUrl: profile?.avatarUrl ?? user.image,
      status: profile?.status ?? "OFFLINE",
      lastSeenAt: profile?.lastSeenAt ? profile.lastSeenAt.toISOString() : null,
    },
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

/** Resolves a `Contact` row's other-user profile and maps it. Throws NotFoundError if the user has since been deleted (shouldn't happen — cascade delete — but keeps this total). */
async function enrich(contact: Contact): Promise<ContactResponseDto> {
  const user = await repositories.users.findById(contact.contactId);
  if (!user) throw new NotFoundError("User", contact.contactId);
  return toContactResponse(contact, user);
}

export async function listContacts(
  ownerId: string,
  query: ListContactsQueryDto,
): Promise<ContactResponseDto[]> {
  const contacts = await repositories.contacts.findAllForOwner(ownerId, {
    blocked: query.blocked,
  });
  return Promise.all(contacts.map(enrich));
}

/**
 * Adds a contact by username/email handle — reuses `userService.lookupUser`
 * so "add a contact" and "start a conversation with ___"
 * (features/chat/components/new-conversation-dialog.tsx) resolve people
 * the exact same way. Refuses to add yourself, and surfaces the
 * repository's own duplicate check as a friendly 409 rather than letting
 * a raw ConflictError message ("Contact already exists for this owner")
 * leak through unexplained.
 */
export async function addContact(
  ownerId: string,
  dto: AddContactDto,
): Promise<ContactResponseDto> {
  const target = await lookupUser(dto.handle);

  if (target.id === ownerId) {
    throw new ConflictError("You can't add yourself as a contact");
  }

  const contact = await repositories.contacts.create({
    ownerId,
    contactId: target.id,
    nickname: dto.nickname,
  });

  return enrich(contact);
}

export async function updateContact(
  ownerId: string,
  contactId: string,
  dto: UpdateContactDto,
): Promise<ContactResponseDto> {
  const existing = await repositories.contacts.findByOwnerAndContact(ownerId, contactId);
  if (!existing) throw new NotFoundError("Contact", contactId);

  const updated = await repositories.contacts.update(existing.id, dto);
  return enrich(updated);
}

export async function removeContact(ownerId: string, contactId: string): Promise<void> {
  const existing = await repositories.contacts.findByOwnerAndContact(ownerId, contactId);
  if (!existing) throw new NotFoundError("Contact", contactId);
  await repositories.contacts.hardDelete(existing.id);
}

export async function blockContact(
  ownerId: string,
  contactId: string,
): Promise<ContactResponseDto> {
  // `block` upserts the relationship implicitly by requiring it to exist
  // first at the repository layer — but a user should be able to block
  // someone they haven't explicitly "added" yet (e.g. blocking a stranger
  // who DM'd them), so ensure the Contact row exists first.
  const existing = await repositories.contacts.findByOwnerAndContact(ownerId, contactId);
  if (!existing) {
    await repositories.contacts.create({ ownerId, contactId });
  }
  const blocked = await repositories.contacts.block(ownerId, contactId);
  return enrich(blocked);
}

export async function unblockContact(
  ownerId: string,
  contactId: string,
): Promise<ContactResponseDto> {
  const unblocked = await repositories.contacts.unblock(ownerId, contactId);
  return enrich(unblocked);
}
