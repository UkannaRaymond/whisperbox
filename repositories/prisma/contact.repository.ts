import type {
  IContactRepository,
  CreateContactInput,
  UpdateContactInput,
} from "../interfaces/contact.repository.interface";
import { NotFoundError, ConflictError } from "../../errors";
import { Contact, PrismaClient } from "@/lib/generated/prisma/client";

export class ContactRepository implements IContactRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Contact | null> {
    return this.prisma.contact.findUnique({ where: { id } });
  }

  async findMany(params?: { take?: number; cursor?: string }): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { createdAt: "asc" },
    });
  }

  async create(data: CreateContactInput): Promise<Contact> {
    const duplicate = await this.findByOwnerAndContact(data.ownerId, data.contactId);
    if (duplicate) throw new ConflictError("Contact already exists for this owner");
    return this.prisma.contact.create({ data });
  }

  async update(id: string, data: UpdateContactInput): Promise<Contact> {
    await this.assertExists(id);
    return this.prisma.contact.update({ where: { id }, data });
  }

  // The `contacts` table has no `deletedAt` column (it's a lightweight
  // ownership relation, not user-generated content), so there's nothing to
  // soft-delete. This just removes the row, same as hardDelete.
  async softDelete(id: string): Promise<Contact> {
    await this.assertExists(id);
    const contact = await this.prisma.contact.findUniqueOrThrow({ where: { id } });
    await this.prisma.contact.delete({ where: { id } });
    return contact;
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.contact.delete({ where: { id } });
  }

  async findByOwnerAndContact(ownerId: string, contactId: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: { ownerId, contactId },
    });
  }

  async findAllForOwner(ownerId: string, params?: { blocked?: boolean }): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: { ownerId, ...(params?.blocked !== undefined ? { blocked: params.blocked } : {}) },
      orderBy: { createdAt: "asc" },
    });
  }

  async block(ownerId: string, contactId: string): Promise<Contact> {
    const contact = await this.findByOwnerAndContact(ownerId, contactId);
    if (!contact) throw new NotFoundError("Contact");
    return this.prisma.contact.update({
      where: { id: contact.id },
      data: { blocked: true, blockedAt: new Date() },
    });
  }

  async unblock(ownerId: string, contactId: string): Promise<Contact> {
    const contact = await this.findByOwnerAndContact(ownerId, contactId);
    if (!contact) throw new NotFoundError("Contact");
    return this.prisma.contact.update({
      where: { id: contact.id },
      data: { blocked: false, blockedAt: null },
    });
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.contact.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundError("Contact", id);
  }
}
