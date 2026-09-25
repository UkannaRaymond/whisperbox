"use strict";

// Plain JS (not TS) because Artillery loads the processor directly with
// Node, no build step — so this duplicates the small bit of logic in
// perf/shared/auth-client.ts rather than importing it.

const APP_URL = process.env.PERF_APP_URL || "http://localhost:3000";

// Pool of seeded test accounts — seed these once (see perf/README.md)
// before running a load test. One real login per virtual user connection
// keeps this honest: it exercises the exact same REST -> ticket ->
// socket-handshake path a real client goes through, Redis ticket storage
// included, rather than faking the handshake.
const USERS = [
  {
    email: process.env.PERF_SENDER_EMAIL,
    password: process.env.PERF_SENDER_PASSWORD,
  },
  {
    email: process.env.PERF_RECEIVER_EMAIL,
    password: process.env.PERF_RECEIVER_PASSWORD,
  },
];

function poolUser(i) {
  return USERS[i % USERS.length];
}
let vuCounter = 0;

async function mintTicket(context, events, done) {
  const { email, password } = poolUser(vuCounter++);

  const loginRes = await fetch(`${APP_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: APP_URL },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) return done(new Error(`login failed: ${loginRes.status}`));

  const cookie =
    typeof loginRes.headers.getSetCookie === "function"
      ? loginRes.headers.getSetCookie().join("; ")
      : loginRes.headers.get("set-cookie") || "";

  const ticketRes = await fetch(`${APP_URL}/api/v1/realtime/ticket`, {
    method: "POST",
    headers: { cookie },
  });
  if (!ticketRes.ok) return done(new Error(`ticket request failed: ${ticketRes.status}`));

  const { data } = await ticketRes.json();

  // artillery.yml's `connect: { auth: { ticket: "{{ ticket }}" } }` step
  // interpolates this straight into the Socket.IO handshake.
  context.vars.ticket = data.ticket;
  context.vars.conversationId = process.env.PERF_LOAD_CONVERSATION_ID || "";

  return done();
}

module.exports = { mintTicket };
