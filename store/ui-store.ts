import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface UIState {
  isSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

/**
 * Global, cross-feature UI chrome state (sidebar, command palette, and
 * similar app-shell concerns).
 *
 * Feature-specific state (chat state, presence, drafts, etc.) belongs in a
 * store colocated with that feature (e.g. `features/chat/store`), not
 * here — this store is intentionally scoped to layout-level UI only so it
 * doesn't become a dumping ground as features are added.
 */
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        isSidebarOpen: true,
        isCommandPaletteOpen: false,
        toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        setSidebarOpen: (open) => set({ isSidebarOpen: open }),
        setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
      }),
      {
        name: "whisperbox-ui",
        partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen }),
      },
    ),
    { name: "UIStore" },
  ),
);
