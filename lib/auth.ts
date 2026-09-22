import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/server/db/client";

/**
 * Better Auth server instance.
 *
 * `emailAndPassword` is enabled below — the app's Login/Register forms
 * (features/auth/components/{login,register}-form.tsx) call
 * `authClient.signIn.email`/`signUp.email` directly, and with this left
 * disabled every sign-up/sign-in attempt was rejected server-side even
 * though the forms themselves were fully built. Better Auth hashes/verifies
 * passwords itself (scrypt) by default; no custom `password.hash`/`verify`
 * override is configured here, so that's what's in effect.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  secret: process.env.AUTH_SECRET,
  baseURL: process.env.AUTH_URL,

  session: {
    // Multi-device sessions are represented as multiple rows
    // in the Session table scoped to one user; expiry/refresh policy is
    // finalized in the Authentication phase.
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day of activity
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "whisperbox",
    defaultCookieAttributes: {
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },

  emailAndPassword: {
    enabled: true,
  },
});

export type Session = typeof auth.$Infer.Session;
