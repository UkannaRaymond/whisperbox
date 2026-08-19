import { create } from "zustand";

/**
 * Global online-presence state.
 *

 * Moving the state here and feeding it from a single subscription
 * mounted once at the app root (usePresenceBridge, wired into
 * app/(app)/layout.tsx next to useRealtimeMessages()) means there's
 * exactly one listener, subscribed before any conversation-level
 * component could possibly mount, and every `usePresence()` call site
 * reads the same shared state instead of racing to catch broadcasts
 * itself.
 */
interface PresenceState {
  onlineUserIds: Set<string>;
  mergeSnapshot: (userIds: string[]) => void;
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
}

export const usePresenceStore = create<PresenceState>()((set) => ({
  onlineUserIds: new Set(),

  // Merges rather than replaces: `authenticated` can fire more than once
  // per socket lifetime (e.g. after a forced reconnect with a fresh
  // ticket — see providers/socket-provider.tsx), and a stale/delayed
  // snapshot landing after a more recent `user_online` for the same
  // user shouldn't be able to clobber it back to absent.
  mergeSnapshot: (userIds) =>
    set((state) => ({ onlineUserIds: new Set([...state.onlineUserIds, ...userIds]) })),

  setOnline: (userId) =>
    set((state) => ({ onlineUserIds: new Set(state.onlineUserIds).add(userId) })),

  setOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId);
      return { onlineUserIds: next };
    }),
}));
