import { getRedisClient } from "../redis/client";

/**
 * Typing indicators (08-WEBSOCKET.md § Features: "Typing indicators").
 * Purely ephemeral, Redis-only state — there is no Postgres table for
 * this and there shouldn't be; "so-and-so is typing" has no useful
 * meaning once you're not actively watching the conversation, and no
 * legitimate audit/history reason exists to keep it (it doesn't reveal
 * message content, so this isn't a zero-knowledge concern — it's just not
 * data worth persisting).
 *
 * The TTL matters more than the explicit `typing_stop` event: if a client
 * disconnects or crashes mid-type without ever sending `typing_stop`, its
 * typing indicator self-expires instead of sticking forever.
 */

const TYPING_TTL_SECONDS = 6;

function typingKey(conversationId: string, userId: string): string {
  return `typing:${conversationId}:${userId}`;
}

export async function startTyping(conversationId: string, userId: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(typingKey(conversationId, userId), "1", "EX", TYPING_TTL_SECONDS);
}

export async function stopTyping(conversationId: string, userId: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(typingKey(conversationId, userId));
}
