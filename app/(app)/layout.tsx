"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { AppSidebar } from "@/features/chat/components/app-sidebar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { MobileNav } from "@/features/chat/components/mobile-nav";
import { IdentityUnlockGate } from "@/features/auth/components/identity-unlock-gate";
import { useRequireUsername } from "@/features/auth/hooks/use-require-username";
import { useSyncEngine } from "@/features/offline/hooks/use-sync-engine";
import { useRealtimeMessages } from "@/features/chat/hooks/use-realtime-messages";
import { usePresenceBridge } from "@/features/chat/hooks/use-presence-bridge";

/**
 * Authenticated app shell
 *
 * Redirects to `/onboarding/username` if the signed-in user hasn't
 * picked a username yet (see `useRequireUsername`'s doc comment), and
 * gates the whole shell behind unlocking this device's encryption identity.
 *
 * Desktop: rail | chat list | conversation, side by side. Phones: one screen at
 * a time — the chat list on `/conversations`, the conversation on
 * `/conversations/[id]`, other sections full-width — with a bottom tab bar
 * everywhere except inside an open chat.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
      <div className="flex min-h-dvh flex-1 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  const isListRoute = pathname === "/conversations";
  const isChatRoute = pathname.startsWith("/conversations/");

  return (
    <IdentityUnlockGate>
      <div className="bg-background fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] md:flex-row">
        <AppSidebar />
        {(isListRoute || isChatRoute) && (
          <div className="pointer-events-none absolute top-3 right-3 z-50 md:top-4 md:right-4">
            <div className="pointer-events-auto">
              <ThemeToggle />
            </div>
          </div>
        )}
        <main
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            isListRoute ? "hidden md:flex" : "flex",
          )}
        >
          {children}
        </main>
        {!isChatRoute && <MobileNav />}
      </div>
    </IdentityUnlockGate>
  );
}
