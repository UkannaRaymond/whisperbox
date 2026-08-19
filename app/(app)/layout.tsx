"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useSession } from "@/lib/auth-client";
import { AppSidebar } from "@/features/chat/components/app-sidebar";
import { IdentityUnlockGate } from "@/features/auth/components/identity-unlock-gate";
import { useRequireUsername } from "@/features/auth/hooks/use-require-username";
import { useSyncEngine } from "@/features/offline/hooks/use-sync-engine";
import { useRealtimeMessages } from "@/features/chat/hooks/use-realtime-messages";
import { usePresenceBridge } from "@/features/chat/hooks/use-presence-bridge";

/**
 * Authenticated app shell (10-FRONTEND.md § UI Components: "Sidebar",
 * "Top Navigation").
 *
 * This route group previously had NO auth guard at all — every route
 * under `(app)` (e.g. `/conversations`) rendered for signed-out visitors
 * too, and `useSyncEngine()`/`useRealtimeMessages()` started
 * unconditionally on mount. For a signed-out visitor that meant the sync
 * engine's first pull (`GET /api/v1/conversations`) hit a 401 immediately
 * and threw an uncaught "Authentication required" error instead of the
 * page just redirecting to `/login`. This now checks `useSession()`
 * first: while it's resolving, nothing renders yet; once resolved, a
 * signed-out visitor is redirected to `/login` before the sidebar, sync
 * engine, or real-time bridge ever mount. `useSyncEngine`'s own
 * `enabled` gate (features/offline/hooks/use-sync-engine.ts) is a second,
 * belt-and-suspenders safeguard against the same failure mode.
 *
 * Also redirects to `/onboarding/username` if the signed-in user hasn't
 * picked a username yet (see `useRequireUsername`'s doc comment), and
 * gates content behind unlocking this device's encryption identity.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: sessionData, isPending: isSessionPending } = useSession();
  const isSignedIn = Boolean(sessionData?.user);

  useSyncEngine(isSignedIn);
  useRealtimeMessages();
  usePresenceBridge();
  const { checking: isUsernameCheckPending } = useRequireUsername();

  React.useEffect(() => {
    if (!isSessionPending && !isSignedIn) {
      router.replace("/login");
    }
  }, [isSessionPending, isSignedIn, router]);

  if (isSessionPending || !isSignedIn || isUsernameCheckPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      <AppSidebar />
      <IdentityUnlockGate>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </IdentityUnlockGate>
    </div>
  );
}
