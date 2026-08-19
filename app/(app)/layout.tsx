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
    <div className="flex h-dvh flex-1 overflow-hidden">
      <AppSidebar />
      <IdentityUnlockGate>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </IdentityUnlockGate>
    </div>
  );
}
