"use client";

import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth-client";
import { useIdentityStore } from "@/features/auth/store/identity-store";

/** Lock-this-device and sign-out, shared by the desktop rail menu and the mobile chat-list menu. */
export function useAccountActions() {
  const router = useRouter();
  const lock = useIdentityStore((state) => state.lock);

  async function handleSignOut() {
    lock();
    await signOut();
    router.push("/login");
  }

  return { lock, signOut: handleSignOut };
}
