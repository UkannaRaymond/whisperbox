import { create } from "zustand";
import * as KeyManager from "@/features/encryption/services/key-manager.service";
import { apiFetch } from "@/lib/api-client";
import { getOrCreateDeviceIdentifier, detectDevicePlatform } from "@/lib/utils";

/**
 * Session-only store for the unlocked RSA private key
 * (features/encryption/services/key-manager.service.ts#unlockIdentity).
 *
 * Deliberately NOT persisted (no `persist` middleware, unlike
 * store/ui-store.ts) — key-manager.service.ts's own doc comment is
 * explicit that the unlocked key should live in memory only "for as long
 * as the session lasts," not survive a refresh. Losing it on reload and
 * re-prompting for the passphrase is the correct behavior, not a bug to
 * fix with persistence.
 */

export type IdentityStatus = "checking" | "no-identity" | "locked" | "unlocked";

interface IdentityState {
  status: IdentityStatus;
  privateKey: CryptoKey | null;
  error: string | null;
  checkStatus: () => Promise<void>;
  createIdentity: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;
}

/**
 * Publishes this device's public key to `POST /v1/devices`
 * (app/api/v1/devices/route.ts) so other users can resolve it when
 * encrypting a message to this account
 * (features/chat/utils/resolve-recipient-keys.ts). `findOrCreate` on the
 * server makes this safe to call every time an identity is created or
 * unlocked — it just refreshes `lastSeenAt` if this device is already
 * registered. Failures are swallowed here: not being able to publish the
 * key yet (offline, transient error) shouldn't block the person from
 * unlocking and reading their own messages, it just means sending a new
 * message will surface resolveRecipientKeys' own clear error until the
 * next successful publish.
 */
async function publishDeviceKey(): Promise<void> {
  try {
    const identity = await KeyManager.getPublicIdentity();
    if (!identity) return;

    await apiFetch("/api/v1/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "This device",
        platform: detectDevicePlatform(),
        devicePublicKey: identity.publicKeySpki,
        fingerprint: identity.fingerprint,
        deviceIdentifier: getOrCreateDeviceIdentifier(),
      }),
    });
  } catch {
    // See doc comment above — intentionally non-fatal.
  }
}

export const useIdentityStore = create<IdentityState>((set) => ({
  status: "checking",
  privateKey: null,
  error: null,

  checkStatus: async () => {
    const hasIdentity = await KeyManager.hasStoredIdentity();
    // Defensive guard: never downgrade an already-"unlocked" session back
    // to "locked"/"no-identity". checkStatus is only ever meant to run
    // once, before anything's been unlocked yet — but if it's ever
    // re-triggered later for any reason (e.g. a future refactor that adds
    // a second caller), silently clobbering a live unlocked session back
    // to a re-prompt would be a much worse bug than this guard being a
    // no-op in the normal case.
    set((state) =>
      state.status === "unlocked" ? state : { status: hasIdentity ? "locked" : "no-identity" },
    );
  },

  createIdentity: async (passphrase: string) => {
    set({ error: null });
    try {
      await KeyManager.initializeIdentity(passphrase);
      const privateKey = await KeyManager.unlockIdentity(passphrase);
      set({ status: "unlocked", privateKey });
      await publishDeviceKey();
    } catch (err) {
      // eslint-disable-next-line no-console -- deliberate: the UI only
      // shows a generic message; this is what to check in the console
      // when someone reports "nothing happened" on submit.
      console.error("[identity] createIdentity failed:", err);
      set({
        error: err instanceof Error ? err.message : "Failed to create your encryption identity.",
      });
    }
  },

  unlock: async (passphrase: string) => {
    set({ error: null });
    try {
      const privateKey = await KeyManager.unlockIdentity(passphrase);
      set({ status: "unlocked", privateKey });
      await publishDeviceKey();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[identity] unlock failed:", err);
      set({ error: err instanceof Error ? err.message : "Incorrect passphrase." });
    }
  },

  lock: () => set({ status: "locked", privateKey: null }),
}));
