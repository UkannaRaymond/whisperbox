import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 moved connection settings out of `schema.prisma` entirely (see
 * the datasource block there, which now only declares `provider`) — the
 * CLI (`prisma generate` / `migrate` / `studio`) reads `DATABASE_URL` from
 * here instead. The `PrismaClient` runtime instance (server/db/client.ts)
 * is configured separately via a driver adapter, since Prisma 7 requires
 * `new PrismaClient({ adapter })` rather than reading the schema's old
 * `datasource.url` at runtime.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
