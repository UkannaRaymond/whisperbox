import type { EncryptedMessageKey } from "@/lib/generated/prisma/client";
import type { IBaseRepository } from "./base.repository.interface";

/** See the multi-device caveat documented on `IMessageRepository` — this wraps per recipient USER, not per device. */
export interface CreateEncryptedMessageKeyInput {
  messageId: string;
  recipientId: string;
  encryptedKey: string;
  algorithm?: string;
}

export type UpdateEncryptedMessageKeyInput = Partial<
  Pick<CreateEncryptedMessageKeyInput, "encryptedKey">
>;

export interface IEncryptedMessageKeyRepository extends IBaseRepository<
  EncryptedMessageKey,
  CreateEncryptedMessageKeyInput,
  UpdateEncryptedMessageKeyInput
> {
  findByMessageId(messageId: string): Promise<EncryptedMessageKey[]>;
  findForRecipient(messageId: string, recipientId: string): Promise<EncryptedMessageKey | null>;
  createMany(keys: CreateEncryptedMessageKeyInput[]): Promise<number>;
}
