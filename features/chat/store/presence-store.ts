import { create } from "zustand";

interface PresenceState {
  onlineUserIds: Set<string>;
  setSnapshot: (userIds: string[]) => void;
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
  clear: () => void;
}

export const usePresenceStore = create<PresenceState>()((set) => ({
  onlineUserIds: new Set(),

  // The authenticated event contains the current complete
  // presence snapshot, so replace the previous state.
  setSnapshot: (userIds) =>
    set({
      onlineUserIds: new Set(userIds),
    }),

  setOnline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.add(userId);
      return { onlineUserIds: next };
    }),

  setOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId);
      return { onlineUserIds: next };
    }),

  clear: () =>
    set({
      onlineUserIds: new Set(),
    }),
}));
