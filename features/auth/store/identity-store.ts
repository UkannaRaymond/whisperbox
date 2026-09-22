import { create } from "zustand";
import * as KeyManager from "@/features/encryption/services/key-manager.service";
import { apiFetch } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { getOrCreateDeviceIdentifier, detectDevicePlatform } from "@/lib/utils";

export type IdentityStatus = "checking" | "no-identity" | "locked" | "unlocked";

interface IdentityState {
  status: IdentityStatus;
  privateKey: CryptoKey | null;
  error: string | null;
  checkStatus: () => Promise<void>;
  createIdentity: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;

  resetDevice: () => Promise<void>;
}

async function publishDeviceKey(userId: string): Promise<void> {
  try {
    const identity = await KeyManager.getPublicIdentity(userId);
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
  } catch (err) {
    console.error("[identity] failed to publish device key:", err);
  }
}

async function requireUserId(): Promise<string> {
  const { data } = await authClient.getSession();
  const userId = data?.user?.id;
  if (!userId) {
    throw new Error("You must be signed in before unlocking or creating an encryption identity.");
  }
  return userId;
}

export const useIdentityStore = create<IdentityState>((set) => ({
  status: "checking",
  privateKey: null,
  error: null,

  checkStatus: async () => {
    try {
      const userId = await requireUserId();
      const hasIdentity = await KeyManager.hasStoredIdentity(userId);

      set((state) =>
        state.status === "unlocked" ? state : { status: hasIdentity ? "locked" : "no-identity" },
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[identity] checkStatus failed:", err);
      set({ status: "no-identity", error: err instanceof Error ? err.message : null });
    }
  },

  createIdentity: async (passphrase: string) => {
    set({ error: null });
    try {
      const userId = await requireUserId();
      await KeyManager.initializeIdentity(userId, passphrase);
      const privateKey = await KeyManager.unlockIdentity(userId, passphrase);
      set({ status: "unlocked", privateKey });
      await publishDeviceKey(userId);
    } catch (err) {
      console.error("[identity] createIdentity failed:", err);
      set({
        error: err instanceof Error ? err.message : "Failed to create your encryption identity.",
      });
    }
  },

  unlock: async (passphrase: string) => {
    set({ error: null });
    try {
      const userId = await requireUserId();
      const privateKey = await KeyManager.unlockIdentity(userId, passphrase);
      set({ status: "unlocked", privateKey });
      await publishDeviceKey(userId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[identity] unlock failed:", err);
      set({ error: err instanceof Error ? err.message : "Incorrect passphrase." });
    }
  },

  lock: () => set({ status: "locked", privateKey: null }),

  resetDevice: async () => {
    const userId = await requireUserId();
    await KeyManager.forgetIdentity(userId);
    set({ status: "no-identity", privateKey: null, error: null });
  },
}));
