"use client";

import * as React from "react";
import * as CryptoService from "@/features/encryption/services/crypto.service";
import { useIdentityStore } from "@/features/auth/store/identity-store";

export type DecryptState =
  | { status: "locked" }
  | { status: "decrypting" }
  | { status: "decrypted"; plaintext: string }
  | { status: "error"; message: string };

/**
 * Decrypts one message's ciphertext given this viewer's own wrapped
 * content key (`MessageResponseDto.encryptedKeyForMe`, see
 * services/mappers.ts#toMessageResponse). Extracted out of
 * `ChatBubble` (features/chat/components/chat-bubble.tsx) so the
 * conversation list's last-message previews
 * (features/chat/components/conversation-card.tsx) can decrypt the same
 * way without duplicating the unwrap-then-decrypt sequence or the
 * stale-result guard.
 *
 * Returns `{ status: "locked" }` whenever decryption can't be attempted
 * at all — no unlocked identity yet, or no wrapped key for this viewer
 * (see `wrappedKeyForMe`'s own doc comment on ChatBubble for the two
 * legitimate reasons that happens). Callers render their own "locked"
 * UI for that state; this hook doesn't prescribe one, since a chat
 * bubble and a one-line list preview want different treatments.
 */
export function useDecryptedText(params: {
  encryptedContent: string;
  nonce: string;
  wrappedKeyForMe?: string | null;
  /** Skip decryption entirely — e.g. a pending/not-yet-sent message that has no server-resolved key yet. */
  skip?: boolean;
}): DecryptState {
  const { encryptedContent, nonce, wrappedKeyForMe, skip } = params;
  const privateKey = useIdentityStore((state) => state.privateKey);

  const [result, setResult] = React.useState<{ key: string; state: DecryptState } | null>(null);
  const messageKey = `${encryptedContent}:${nonce}:${wrappedKeyForMe ?? ""}`;

  React.useEffect(() => {
    if (skip || !privateKey || !wrappedKeyForMe) return;

    let cancelled = false;
    CryptoService.unwrapContentKey(wrappedKeyForMe, privateKey)
      .then((contentKey) =>
        CryptoService.decryptText({ ciphertext: encryptedContent, nonce }, contentKey),
      )
      .then((text) => {
        if (!cancelled)
          setResult({ key: messageKey, state: { status: "decrypted", plaintext: text } });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResult({
            key: messageKey,
            state: {
              status: "error",
              message: error instanceof Error ? error.message : "Failed to decrypt",
            },
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [skip, privateKey, wrappedKeyForMe, encryptedContent, nonce, messageKey]);

  if (skip || !privateKey || !wrappedKeyForMe) return { status: "locked" };
  if (result?.key === messageKey) return result.state;
  return { status: "decrypting" };
}
