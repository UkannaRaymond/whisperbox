import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { createLogger } from "@/server/logger";

const log = createLogger("prisma");

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? [
            { level: "warn", emit: "event" },
            { level: "error", emit: "event" },
          ]
        : [{ level: "error", emit: "event" }],
  });
}

/**
 * Singleton Prisma client.
 *
 * In development, Next.js hot-reloads server modules, which would
 * otherwise create a new PrismaClient (and a new connection pool) on every
 * edit. Caching it on globalThis keeps a single instance alive across
 * reloads.
 */
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

prisma.$on("warn" as never, (event: unknown) => {
  log.warn({ event }, "Prisma warning");
});

prisma.$on("error" as never, (event: unknown) => {
  log.error({ event }, "Prisma error");
});
