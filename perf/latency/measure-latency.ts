import "dotenv/config";
import { io } from "socket.io-client";
import { login, fetchSocketTicket, warmUp, keepAlive, SOCKET_URL } from "../shared/auth-client";
import { writeFileSync, mkdirSync } from "node:fs";

/**
 * Measures send -> new_message round-trip latency between two clients in
 * an existing DIRECT conversation.
 *
 * Run: pnpm tsx perf/latency/measure-latency.ts
 *
 * Prereqs (fill these in — see perf/README.md):
 *   - Two seeded test users, both members of CONVERSATION_ID
 *   - PERF_SENDER_EMAIL / PERF_SENDER_PASSWORD
 *   - PERF_RECEIVER_EMAIL / PERF_RECEIVER_PASSWORD
 *   - PERF_CONVERSATION_ID
 */

import { randomUUID } from "node:crypto";

const CONVERSATION_ID = process.env.PERF_CONVERSATION_ID ?? "";
const MESSAGE_COUNT = Number(process.env.PERF_MESSAGE_COUNT ?? 50);
const PER_MESSAGE_TIMEOUT_MS = 10_000;

async function connectAs(email: string, password: string) {
  const session = await login({ email, password });
  const ticket = await fetchSocketTicket(session);
  const socket = io(SOCKET_URL, { auth: { ticket }, transports: ["websocket"] });

  await new Promise<void>((resolve, reject) => {
    socket.once("authenticated", () => resolve());
    socket.once("connect_error", reject);
  });

  return { socket, userId: session.userId };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) throw new Error("percentile() called on an empty sample set");
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx]!;
}

async function main() {
  if (!CONVERSATION_ID) throw new Error("Set PERF_CONVERSATION_ID before running.");

  await warmUp(SOCKET_URL, "Socket service");
  const alive = keepAlive();

  const sender = await connectAs(
    process.env.PERF_SENDER_EMAIL ?? "",
    process.env.PERF_SENDER_PASSWORD ?? "",
  );
  const receiver = await connectAs(
    process.env.PERF_RECEIVER_EMAIL ?? "",
    process.env.PERF_RECEIVER_PASSWORD ?? "",
  );

  const samples: number[] = [];

  for (let i = 0; i < MESSAGE_COUNT; i++) {
    const clientMessageId = randomUUID(); // createMessageSchema requires a real UUID
    const sentAt = performance.now();

    const received = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        receiver.socket.off("new_message", handler);
        reject(
          new Error(
            `message ${i} (${clientMessageId}) never arrived within ${PER_MESSAGE_TIMEOUT_MS}ms`,
          ),
        );
      }, PER_MESSAGE_TIMEOUT_MS);

      const handler = (payload: { clientMessageId: string }) => {
        if (payload.clientMessageId === clientMessageId) {
          clearTimeout(timer);
          samples.push(performance.now() - sentAt);
          receiver.socket.off("new_message", handler);
          resolve();
        }
      };
      receiver.socket.on("new_message", handler);
    });

    sender.socket.emit(
      "send_message",
      {
        conversationId: CONVERSATION_ID,
        clientMessageId,
        encryptedContent: "perf-test-opaque-blob",
        nonce: "perf-test-nonce",
        // Server only stores this opaquely (never decrypts it — see
        // send-message.handler.ts), but the schema requires at least
        // one entry, so a dummy key for the actual receiver is enough.
        encryptedKeys: [{ recipientId: receiver.userId, encryptedKey: "perf-test-key" }],
      },
      (ack: { ok: boolean; error?: string }) => {
        if (!ack?.ok) console.error(`send_message ${i} rejected:`, ack?.error);
      },
    );

    await received;
    await new Promise((r) => setTimeout(r, 50)); // small gap so messages don't coalesce
  }

  alive.stop();

  samples.sort((a, b) => a - b);
  if (samples.length === 0) {
    throw new Error(
      "No latency samples recorded — check that the receiver's new_message handler fired at all.",
    );
  }

  const result = {
    n: samples.length,
    medianMs: Math.round(percentile(samples, 50)),
    p95Ms: Math.round(percentile(samples, 95)),
    minMs: Math.round(samples[0]!),
    maxMs: Math.round(samples[samples.length - 1]!),
    target: SOCKET_URL,
    ranAt: new Date().toISOString(),
  };

  console.log(result);

  mkdirSync("perf/results", { recursive: true });
  writeFileSync(
    `perf/results/latency-${Date.now()}.json`,
    JSON.stringify({ samples, ...result }, null, 2),
  );

  sender.socket.disconnect();
  receiver.socket.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
