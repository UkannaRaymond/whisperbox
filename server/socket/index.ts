import "dotenv/config";
import { createServer } from "node:http";
import { createSocketGateway } from "./gateway";
import { createLogger } from "../logger";
import { env } from "../../config/env";

/**
 * Standalone entry point for the Socket.IO gateway (08-WEBSOCKET.md — this
 * runs as its own Node process, separate from the Next.js app).
 *
 * Why a separate process instead of embedding this in Next.js's own
 * server: Next.js App Router route handlers don't expose the underlying
 * `http.Server` needed to attach Socket.IO's WebSocket upgrade handling,
 * and most Next.js deployment targets (serverless, edge) don't keep a
 * long-lived process around at all, which a WebSocket server fundamentally
 * requires. `NEXT_PUBLIC_SOCKET_URL` being a distinct public URL from the
 * app itself (config/env.ts) reflects this: the socket gateway is meant to
 * be deployed as its own service (e.g. its own Railway service per the
 * TRD's deployment target), reachable at a different origin.
 *
 * Run with: `npm run socket:dev` (tsx, auto-restart) or
 * `npm run socket:start` (production).
 */

const log = createLogger("socket:bootstrap");

async function main() {
  // Was reading process.env.SOCKET_PORT directly, bypassing
  // config/env.ts's validation entirely — an invalid value (non-numeric,
  // out of range) would previously fall through to the `?? 4001` default
  // silently instead of failing at boot like every other misconfigured
  // env var does.
  const port = env.SOCKET_PORT;

  const httpServer = createServer((req, res) => {
    // This process serves nothing over plain HTTP except a health check —
    // all real traffic is the Socket.IO WebSocket upgrade.
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await createSocketGateway(httpServer);

  httpServer.listen(port, () => {
    log.info({ port }, "Socket.IO gateway listening");
  });

  const shutdown = (signal: string) => {
    log.info({ signal }, "Shutting down socket gateway");
    httpServer.close(() => process.exit(0));
    // Force-exit if connections don't close promptly.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  log.fatal({ error }, "Failed to start socket gateway");
  process.exit(1);
});
