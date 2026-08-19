import { getRedisClient } from "../redis/client";
import { repositories } from "../../repositories/prisma";
import { createLogger } from "../logger";

const log = createLogger("socket:presence");

/**
 * Online/offline presence (08-WEBSOCKET.md § Features: "Online/offline
 * presence"). Tracked in Redis as a per-user connection COUNT, not a
 * boolean — a user can have multiple simultaneous sockets (multiple tabs,
 * multiple devices per the PRD's multi-device requirement), and presence
 * should only flip to "offline" when the LAST connection closes, not the
 * first. A plain boolean would flicker a still-online user to "offline"
 * the moment they closed one of several open tabs.
 *
 * The counter is a shared Redis key (not per-process memory), so presence
 * is correct across however many Socket.IO server instances are running
 * behind the Redis adapter (08-WEBSOCKET.md § Scaling).
 */

function presenceKey(userId: string): string {
  return `presence:count:${userId}`;
}

/** Call on every new connection. Returns true only on the transition from 0 -> 1 connections (this is the user's *first* active connection right now) — that's the signal to broadcast `user_online` and touch the DB. */
export async function registerConnection(userId: string): Promise<boolean> {
  const redis = await getRedisClient();
  const count = await redis.incr(presenceKey(userId));
  return count === 1;
}

/** Call on every disconnection. Returns true only on the transition to 0 (this was the user's *last* active connection) — that's the signal to broadcast `user_offline` and touch the DB. */
export async function deregisterConnection(userId: string): Promise<boolean> {
  const redis = await getRedisClient();
  const count = await redis.decr(presenceKey(userId));

  if (count <= 0) {
    // Clean up the key entirely rather than leaving a 0 (or, if something
    // went wrong and a disconnect fired without a matching connect,
    // negative) counter lying around.
    await redis.del(presenceKey(userId));
    if (count < 0) {
      log.warn(
        { userId, count },
        "Presence counter went negative — deregistered more connections than were registered",
      );
    }
    return true;
  }

  return false;
}

export async function isUserOnline(userId: string): Promise<boolean> {
  const redis = await getRedisClient();
  const count = await redis.get(presenceKey(userId));
  return Number(count ?? 0) > 0;
}

/** Bulk version of `isUserOnline` — one round-trip via MGET instead of N separate GETs, for computing a connect-time presence snapshot across every member of however many conversations a client just joined. */
export async function getOnlineUserIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const redis = await getRedisClient();
  const counts = await redis.mget(userIds.map(presenceKey));
  return userIds.filter((_, index) => Number(counts[index] ?? 0) > 0);
}

/** Persists the presence transition to `UserProfile` so REST reads (e.g. GET /v1/users/{id}) stay consistent with real-time state. */
export async function syncPresenceToDatabase(userId: string, online: boolean): Promise<void> {
  try {
    await repositories.users.updatePresence(userId, online ? "ONLINE" : "OFFLINE");
  } catch (error) {
    // A user might not have a UserProfile row yet (see the profile-required
    // note in services/user.service.ts) — don't let that break the
    // real-time presence broadcast, just log it.
    log.warn({ userId, error }, "Failed to sync presence to database");
  }
}
