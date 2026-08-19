"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useSession } from "@/lib/auth-client";

/**
 * Shell for post-sign-up onboarding steps (currently just
 * `/onboarding/username`). Deliberately its own route group rather than
 * living under `(auth)`: the person is expected to already be signed in
 * at this point — this isn't a login/register screen, just the same
 * centered-card layout.
 *
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
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold">
            WhisperBox
          </Link>
        </div>
        {isSessionPending || !isSignedIn ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading" />
          </div>
        ) : (
          children
        )}
      </div>
    </main>
  );
}
