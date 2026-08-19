import { NextResponse } from "next/server";

import { createLogger } from "@/server/logger";
import { prisma } from "@/server/db/client";
import { getRedisClient } from "@/server/redis/client";

const log = createLogger("api:health");

/**
 * Liveness/readiness probe (docker-compose.yml's `app` healthcheck,
 * Dockerfile's `HEALTHCHECK` directive, and any orchestrator's
 * readiness/liveness probe all hit this).
 */
export async function GET() {
  const [dbResult, redisResult] = await Promise.allSettled([checkDatabase(), checkRedis()]);

  const checks = {
    database: dbResult.status === "fulfilled" ? "ok" : "error",
    redis: redisResult.status === "fulfilled" ? "ok" : "error",
  } as const;

  const isHealthy = checks.database === "ok" && checks.redis === "ok";

  if (!isHealthy) {
    log.error(
      {
        checks,
        databaseError: dbResult.status === "rejected" ? String(dbResult.reason) : undefined,
        redisError: redisResult.status === "rejected" ? String(redisResult.reason) : undefined,
      },
      "Health check failed",
    );
  }

  return NextResponse.json(
    {
      success: isHealthy,
      data: {
        status: isHealthy ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        checks,
      },
    },
    { status: isHealthy ? 200 : 503 },
  );
}

async function checkDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

async function checkRedis(): Promise<void> {
  const client = await getRedisClient();
  const pong = await client.ping();
  if (pong !== "PONG") throw new Error(`Unexpected Redis PING response: ${pong}`);
}
