import { Contact } from "@/lib/generated/prisma/client";
import type { IBaseRepository } from "./base.repository.interface";

export interface CreateContactInput {
  ownerId: string;
  contactId: string;
  nickname?: string;
  favorite?: boolean;
}

export interface UpdateContactInput {
  nickname?: string | null;
  notes?: string | null;
  favorite?: boolean;
  pinned?: boolean;
}

export interface IContactRepository extends IBaseRepository<
  Contact,
  CreateContactInput,
  UpdateContactInput
> {
  findByOwnerAndContact(ownerId: string, contactId: string): Promise<Contact | null>;
  findAllForOwner(ownerId: string, params?: { blocked?: boolean }): Promise<Contact[]>;
  block(ownerId: string, contactId: string): Promise<Contact>;
  unblock(ownerId: string, contactId: string): Promise<Contact>;
}
