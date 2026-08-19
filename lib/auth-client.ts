"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Better Auth REACT client — the browser-side counterpart to lib/auth.ts.
 *
 * `signIn.email`/`signUp.email`/`useSession` all work against a live,
 * enabled `emailAndPassword` provider (see lib/auth.ts). Note that
 * `username` is NOT one of the fields `signUp.email` collects — Better
 * Auth's core `User` row has no username column, and no `username`
 * plugin is configured here. WhisperBox's username lives on a separate
 * `UserProfile` row instead, set one step after sign-up via
 * `POST /api/v1/users/me/profile` (features/auth/components/
 * set-username-form.tsx, at `/onboarding/username`).
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { useSession, signIn, signUp, signOut } = authClient;
