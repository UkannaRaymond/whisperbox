import * as CryptoService from "@/features/encryption/services/crypto.service";
import type { LocalMessage } from "@/features/offline/types/offline.types";

/**
 * Best-effort decrypt of one cached message's text, for search
 * (features/search/hooks/use-search.ts). Returns null rather than
 * throwing on any failure — no wrapped key for this viewer, wrong/absent
 * private key, corrupt ciphertext — since a search scanning many cached
 * messages must not abort entirely because one of them can't be read;
 * that message is simply excluded from message-search results (it can
 * still surface via conversation/contact name matching).
 */
export async function tryDecryptMessageText(
  message: LocalMessage,
  privateKey: CryptoKey,
): Promise<string | null> {
  if (!message.encryptedKeyForMe) return null;

  try {
    const contentKey = await CryptoService.unwrapContentKey(message.encryptedKeyForMe, privateKey);
    return await CryptoService.decryptText(
      { ciphertext: message.encryptedContent, nonce: message.nonce },
      contentKey,
    );
  } catch {
    return null;
  }
}
