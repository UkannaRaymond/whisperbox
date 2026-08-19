import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * Returns `true` once the component has hydrated on the client, `false`
 * during SSR and the first client render. Used to defer rendering of
 * anything that depends on client-only state (e.g. the resolved theme)
 * until after hydration, without calling `setState` inside an effect.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
