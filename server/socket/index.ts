import "dotenv/config";

import { createServer } from "node:http";

import { createSocketGateway } from "./gateway";

import { createLogger } from "../logger";

import { env } from "../../config/env";

const log = createLogger("socket:bootstrap");

async function main() {
  const port = Number(process.env.PORT) || env.SOCKET_PORT;

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

  httpServer.listen(port, "0.0.0.0", () => {
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
