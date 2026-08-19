import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Per-conversation composer draft text (10-FRONTEND.md § State Management:
 * "Zustand for UI state"). Persisted to localStorage (via zustand's
 * `persist` middleware) so an in-progress draft survives navigating away
 * and back, or a reload — ordinary UI convenience state, not sensitive
 * data, so persistence here is fine (contrast with
 * features/auth/store/identity-store.ts, which deliberately never
 * persists the unlocked private key).
 */
interface ComposerState {
  drafts: Record<string, string>;
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;
}

export const useComposerStore = create<ComposerState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (conversationId, text) =>
        set((state) => ({ drafts: { ...state.drafts, [conversationId]: text } })),
      clearDraft: (conversationId) =>
        set((state) => {
          const { [conversationId]: _removed, ...rest } = state.drafts;
          return { drafts: rest };
        }),
    }),
    { name: "whisperbox-composer-drafts" },
  ),
);
