# WhisperBox perf kit

Drop this `perf/` folder in at the project root (sibling to `app/`, `server/`, `tests/`).
Not under `tests/` on purpose — Vitest picks up `tests/unit` and `tests/integration`,
and these are on-demand/manual, not CI-gated.

## Install (once)

```bash
pnpm add -D tsx artillery artillery-engine-socketio-v3 socket.io-client
```

Artillery's _built-in_ `socketio` engine ships a Socket.IO v2 client, which
won't handshake with your v4 server — `artillery-engine-socketio-v3` is the
one that actually works here (that's also why `artillery.yml` below uses
the `socketio-v3` engine key, not `socketio`).

## One-time setup: seed test accounts + a conversation

These scripts authenticate as real users through the real REST + ticket
flow (that's the point — it's what makes the numbers meaningful), so you
need real accounts to log in as:

1. Sign up 2+ test accounts (via the app's `/register` flow, or by
   scripting `POST {APP_URL}/api/auth/sign-up/email` the same way
   `perf/shared/auth-client.ts#login` calls sign-in).
2. Create a DIRECT conversation between two of them (via the UI, or
   `POST /v1/conversations` — check `schemas/conversation.schema.ts` for
   the exact payload your version expects, since it may need device
   public keys up front for the E2E key exchange).
3. Note the conversation's id.
4. For the load test, seed a larger pool (`perf-user-1@test.dev` ...
   `perf-user-N@test.dev`) — `perf/load/processor.js` expects that naming
   convention, or change `poolUser()` to match however you seed.

## Configure

Copy `perf/.env.perf.example` to `.env.perf` at the project root and fill
in real values (keep `.env.perf` out of git). Load it with
`--env-file=.env.perf` or `dotenv-cli`.

`PERF_APP_URL` is wherever your Next.js app is deployed (Vercel, in this
setup); `PERF_SOCKET_URL` is your Render socket service.

The latency and reconnect scripts call `warmUp()` automatically before
timing anything — it polls the socket service's `/health` endpoint until
it responds, which handles a Render free-tier cold start (up to ~90s)
without you needing to do anything manually. If you're on a paid Render
plan this just resolves instantly and costs nothing.

## Run

```bash
# latency (30-50 messages between two real clients)
pnpm tsx --env-file=.env.perf perf/latency/measure-latency.ts

# reconnect recovery time (N disconnect/reconnect cycles)
pnpm tsx --env-file=.env.perf perf/reconnect/measure-reconnect.ts

# concurrent connections load test
pnpm dotenv -e .env.perf -- artillery run perf/load/artillery.yml
```

Each script prints a summary and writes the raw samples to
`perf/results/*.json` (gitignored) so your reported numbers are
reproducible later.

## Where to point these

- First pass, while you're debugging the scripts themselves: point
  `PERF_APP_URL`/`PERF_SOCKET_URL` at your local `docker-compose` stack
  (`pnpm socket:start` / `docker compose up`).
- Final numbers you'll actually report: point them at your Render-deployed
  socket service, ideally a staging/preview instance sized like
  production — not a live instance with real users on it.

Artillery itself doesn't call `warmUp()` — if you're on Render's free
tier, curl the socket service's `/health` endpoint once (or just run
`measure-reconnect.ts`, which warms it up as a side effect) before firing
the load test, so the ramp-up phase isn't spent waiting on a cold start.

## Load test tool note

Artillery, not k6 — k6 doesn't speak the Socket.IO protocol natively
(WebSocket only), so it'd need the `xk6-socketio` extension and a custom
build. `artillery-engine-socketio` handles the handshake for you.
Double-check `perf/load/processor.js`'s ticket-wiring comment against
whatever version of that engine you install — the exact `context.vars`
key it reads for connect-time auth has changed across versions.
