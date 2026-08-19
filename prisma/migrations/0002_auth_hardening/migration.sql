-- WhisperBox — Stage 06 — Auth hardening
-- Additive-only migration on top of 0001_init (DATABASE.md: "No destructive
-- migrations in production"). Adds:
--   1. Role-based authorization (users.role)
--   2. Account lockout tracking (users.failed_login_attempts / locked_until)
--   3. A durable link from refresh_tokens -> sessions, so revoking a
--      session can cascade to every refresh token issued under it, and so
--      "one refresh token per device" can be enforced by looking up the
--      device's active session.
--   4. A uniqueness guarantee that a given device row is reused across
--      logins instead of duplicated (user_devices.user_id + device_public_key).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE "user_role" AS ENUM ('USER', 'ADMIN');

-- ---------------------------------------------------------------------------
-- users: role + account lockout
-- ---------------------------------------------------------------------------
ALTER TABLE "users"
    ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'USER',
    ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "locked_until" TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- user_devices: reuse the same device row across logins
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "user_devices_user_id_device_public_key_key"
    ON "user_devices"("user_id", "device_public_key");

-- ---------------------------------------------------------------------------
-- refresh_tokens: link back to the session it was issued under
-- ---------------------------------------------------------------------------
ALTER TABLE "refresh_tokens"
    ADD COLUMN "session_id" UUID;

ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");
