"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { useSession } from "@/lib/auth-client";

/**
 * Shell for post-sign-up onboarding steps (currently just
 * `/onboarding/username`). Deliberately its own route group rather than
 * living under `(auth)`: the person is expected to already be signed in
 * at this point — this isn't a login/register screen, just the same
 * auth frame.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: sessionData, isPending: isSessionPending } = useSession();
  const isSignedIn = Boolean(sessionData?.user);

  React.useEffect(() => {
    if (!isSessionPending && !isSignedIn) {
      router.replace("/login");
    }
  }, [isSessionPending, isSignedIn, router]);

  return (
    <AuthShell>
      {isSessionPending || !isSignedIn ? (
        <div className="flex justify-center py-10">
          <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading" />
        </div>
      ) : (
        children
      )}
    </AuthShell>
  );
}
