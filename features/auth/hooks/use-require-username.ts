"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import type { UserResponseDto } from "@/schemas/user.schema";

/**
 * Sends a signed-in user who hasn't picked a username yet to
 * `/onboarding/username` (features/auth/components/set-username-form.tsx)
 * before they can use the rest of the app. Username is no longer
 * collected on the register form itself (see doc comment on
 * RegisterForm), so this is what actually enforces that it gets set
 * before someone can, say, open a conversation with a blank display
 * name. A no-op while signed out or already on that page.
 */
export function useRequireUsername(): { checking: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const { data: sessionData, isPending: isSessionPending } = useSession();
  const isSignedIn = Boolean(sessionData?.user);

  const { data: me, isLoading: isMeLoading } = useQuery<UserResponseDto>({
    queryKey: ["users", "me", "username-check"],
    queryFn: () => apiFetch<UserResponseDto>("/api/v1/users/me"),
    enabled: isSignedIn && pathname !== "/onboarding/username",
    staleTime: 60_000,
  });

  const needsUsername = isSignedIn && me !== undefined && !me.username;

  React.useEffect(() => {
    if (needsUsername && pathname !== "/onboarding/username") {
      router.replace("/onboarding/username");
    }
  }, [needsUsername, pathname, router]);

  const checking =
    isSessionPending || (isSignedIn && pathname !== "/onboarding/username" && isMeLoading);
  return { checking };
}
