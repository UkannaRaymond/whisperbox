import type { NextRequest } from "next/server";
import { auth as betterAuth } from "@/lib/auth";
import { UnauthorizedError } from "../errors";

export interface AuthContext {
  userId: string;
}

/** Resolves the caller's session, if any. Returns null instead of throwing when it's absent or invalid. */
export async function auth(request: NextRequest): Promise<AuthContext | null> {
  const result = await betterAuth.api.getSession({ headers: request.headers });
  if (!result) return null;
  return { userId: result.user.id };
}

/** Requires a valid session. Throws UnauthorizedError (-> 401) if missing/invalid. */
export async function requireUser(request: NextRequest): Promise<AuthContext> {
  const context = await auth(request);
  if (!context) {
    throw new UnauthorizedError();
  }
  return context;
}

export { UnauthorizedError };
