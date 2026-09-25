import "dotenv/config";
import { io } from "socket.io-client";
import { login, fetchSocketTicket, warmUp, keepAlive, SOCKET_URL } from "../shared/auth-client";
import { writeFileSync, mkdirSync } from "node:fs";

/**
 * Measures time-to-recover after a forced disconnect, repeated N times.
 * "Recovered" = the server has re-authenticated the socket and sent
 * `authenticated` again (mirrors real client behavior on
 * `reconnect_required` / a dropped connection) — not just the raw
 * transport reconnect, since a socket isn't usable until then.
 *
 * Run: pnpm tsx perf/reconnect/measure-reconnect.ts
 * Prereqs: PERF_SENDER_EMAIL / PERF_SENDER_PASSWORD (reuse any seeded user)
 *
 * IMPORTANT: logs in ONCE, outside the timed loop, and reuses that
 * session for every cycle — only fetching a fresh ticket each time
 * (tickets are single-use, so that part must repeat). A real client
 * reconnecting after a dropped connection still has its existing session
 * cookie; it doesn't re-authenticate with a password every time. Doing a
 * fresh login() per cycle (an earlier version of this script did) mixes
 * Argon2id password-hashing cost — deliberately slow by design — into
 * what's supposed to be a reconnect-speed measurement, and dominates the
 * result: that's a measurement bug, not something about Socket.IO.
 */

const CYCLES = Number(process.env.PERF_RECONNECT_CYCLES ?? 20);

async function reconnectOnce(session: Awaited<ReturnType<typeof login>>) {
  const ticket = await fetchSocketTicket(session);
  const startedAt = performance.now();

  const socket = io(SOCKET_URL, {
    auth: { ticket },
    transports: ["websocket"],
    reconnection: false, // we drive reconnects manually — see file header
  });

  await new Promise<void>((resolve, reject) => {
    socket.once("authenticated", () => resolve());
    socket.once("connect_error", reject);
  });

  return { socket, recoveryMs: performance.now() - startedAt };
}

async function main() {
  const email = process.env.PERF_SENDER_EMAIL ?? "";
  const password = process.env.PERF_SENDER_PASSWORD ?? "";
  if (!email || !password) throw new Error("Set PERF_SENDER_EMAIL / PERF_SENDER_PASSWORD.");

  await warmUp(SOCKET_URL, "Socket service");
  const alive = keepAlive();

  // Logged in once, before timing starts — not part of any sample.
  const session = await login({ email, password });

  const samples: number[] = [];

  for (let i = 0; i < CYCLES; i++) {
    const { socket, recoveryMs } = await reconnectOnce(session);
    samples.push(recoveryMs);
    socket.disconnect();
    await new Promise((r) => setTimeout(r, 200)); // let the server finish disconnect cleanup
  }

  alive.stop();

  samples.sort((a, b) => a - b);
  if (samples.length === 0) {
    throw new Error("No reconnect samples recorded — check CYCLES and the connect() flow above.");
  }

  const result = {
    n: samples.length,
    medianMs: Math.round(samples[Math.floor(samples.length / 2)]!),
    p95Ms: Math.round(samples[Math.ceil(samples.length * 0.95) - 1]!),
    maxMs: Math.round(samples[samples.length - 1]!),
    target: SOCKET_URL,
    ranAt: new Date().toISOString(),
  };

  console.log(result);

  mkdirSync("perf/results", { recursive: true });
  writeFileSync(
    `perf/results/reconnect-${Date.now()}.json`,
    JSON.stringify({ samples, ...result }, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
