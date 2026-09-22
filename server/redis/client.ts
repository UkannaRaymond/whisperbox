import type { Redis as RedisClient } from "ioredis";

import { createLogger } from "@/server/logger";

const log = createLogger("redis");

declare global {
  var __redis: RedisClient | undefined;
}

export async function getRedisClient(): Promise<RedisClient> {
  if (globalThis.__redis) {
    return globalThis.__redis;
  }

  const { Redis } = await import("ioredis");

  const client = new Redis(process.env.REDIS_URL ?? "", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  client.on("error", (error: Error) => {
    log.error({ error: error.message }, "Redis connection error");
  });

  client.on("connect", () => {
    log.info("Redis connected");
  });

  globalThis.__redis = client;

  return client;
}
