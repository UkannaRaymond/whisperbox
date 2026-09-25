import "dotenv/config";

/**
 * Shared helper for every perf script: logs a seeded test user in via
 * Better Auth's REST endpoint (the same one authClient.signIn.email
 * calls in the browser — see lib/auth-client.ts), then mints a
 * short-lived Socket.IO connection ticket (see
 * server/socket/ticket.service.ts) for that session.
 *
 * Every socket connection in these scripts MUST go through
 * fetchSocketTicket() right before connecting — tickets are single-use
 * and expire in 30s (server/socket/ticket.service.ts), so don't cache
 * or reuse one across connections.
 */

export const APP_URL = process.env.PERF_APP_URL ?? "http://localhost:3000";
export const SOCKET_URL = process.env.PERF_SOCKET_URL ?? "http://localhost:4001";

export interface TestUser {
  email: string;
  password: string;
}

export interface AuthedSession {
  userId: string;
  cookie: string;
}

export async function login(user: TestUser): Promise<AuthedSession> {
  const res = await fetch(`${APP_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Node's fetch doesn't send an Origin header the way a browser
      // does, but Better Auth rejects requests without one (this is
      // what MISSING_OR_NULL_ORIGIN means). APP_URL is trusted by
      // definition — it's the same origin the request is going to.
      origin: APP_URL,
    },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });

  if (!res.ok) {
    throw new Error(`login failed for ${user.email}: ${res.status} ${await res.text()}`);
  }

  // Node's fetch doesn't persist cookies across requests like a browser
  // does, so we grab the Set-Cookie value ourselves and forward it
  // explicitly on every request that needs the session (the ticket
  // endpoint below). getSetCookie() needs Node 19.7+ / 20+; the
  // single-header fallback covers older runtimes with one cookie.
  const setCookie =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie().join("; ")
      : (res.headers.get("set-cookie") ?? "");

  if (!setCookie) throw new Error(`no session cookie returned for ${user.email}`);

  const body = (await res.json()) as { user?: { id: string } };
  if (!body.user?.id) throw new Error(`unexpected sign-in response shape: ${JSON.stringify(body)}`);

  return { userId: body.user.id, cookie: setCookie };
}

export async function fetchSocketTicket(session: AuthedSession): Promise<string> {
  const res = await fetch(`${APP_URL}/api/v1/realtime/ticket`, {
    method: "POST",
    headers: { cookie: session.cookie },
  });

  if (!res.ok) throw new Error(`ticket request failed: ${res.status} ${await res.text()}`);

  const { data } = (await res.json()) as { data: { ticket: string } };
  return data.ticket;
}

/**
 * Neon's free tier suspends its compute endpoint after a few minutes
 * idle, and the next query pays a multi-second cold start (this is what
 * you're seeing if `SELECT 1` health checks take 1-9s instead of a few
 * ms). Pinging /api/health on an interval throughout a test run keeps
 * the endpoint awake so your latency/reconnect numbers reflect real
 * query time plus network RTT, not repeated cold starts. Call this once
 * at the top of a script and stop() it in a finally block.
 */
export function keepAlive(intervalMs = 30_000): { stop: () => void } {
  const timer = setInterval(() => {
    fetch(`${APP_URL}/api/health`).catch(() => {
      // best-effort — a missed ping just risks one future cold start, not a crash
    });
  }, intervalMs);
  return { stop: () => clearInterval(timer) };
}

/**
 * Render's free tier spins a web service down after 15 min idle; the
 * first request after that takes ~30-60s to wake it. That's long enough
 * to eat a ticket's 30s TTL and to badly skew latency/reconnect samples,
 * so every script calls this before doing anything timed. It's a no-op
 * cost (a few seconds) once the service is already awake — safe to call
 * unconditionally, including against a paid instance that never sleeps.
 */
export async function warmUp(url: string, label: string, maxWaitMs = 90_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) {
        const waited = Date.now() - start;
        if (waited > 2000) console.log(`${label} took ${Math.round(waited / 1000)}s to wake up`);
        return;
      }
    } catch {
      // not up yet — fall through to retry
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`${label} (${url}) never responded within ${maxWaitMs}ms`);
}
