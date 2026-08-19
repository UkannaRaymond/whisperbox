import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { createLogger } from "../logger";
import { socketAuthMiddleware } from "./socket-auth";
import { rejoinAllRooms, conversationRoom } from "./rooms";
import {
  registerConnection,
  deregisterConnection,
  syncPresenceToDatabase,
  getOnlineUserIds,
} from "./presence.service";
import { registerAllHandlers } from "./handlers";
import { repositories } from "../../repositories/prisma";
import type { AppServer, AppSocket } from "./socket-auth";

const log = createLogger("socket:gateway");

/**
 * Socket Gateway (08-WEBSOCKET.md § Deliverables: "Socket Gateway").
 *
 * Attaches a Socket.IO server to an existing `http.Server` (see
 * server/socket/index.ts for the standalone process that creates one),
 * wires the Redis adapter for horizontal scaling (08-WEBSOCKET.md §
 * Scaling: "Socket.IO Adapter", "Redis Pub/Sub"), and drives the
 * connection lifecycle: authenticate -> rejoin rooms -> track presence ->
 * register event handlers -> clean up on disconnect.
 */
export async function createSocketGateway(httpServer: HttpServer): Promise<AppServer> {
  const io: AppServer = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      credentials: true,
    },
  });

  // Dedicated pub/sub connections for the adapter — NOT the shared
  // getRedisClient() singleton used elsewhere. Once a connection issues
  // SUBSCRIBE it can no longer be used for ordinary commands, so the
  // adapter needs its own pair rather than sharing the app-wide client.
  const pubClient = new Redis(process.env.REDIS_URL ?? "");
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  pubClient.on("error", (error) => log.error({ error: error.message }, "Redis pub client error"));
  subClient.on("error", (error) => log.error({ error: error.message }, "Redis sub client error"));

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    void handleConnection(io, socket);
  });

  log.info("Socket.IO gateway initialized");
  return io;
}

async function handleConnection(io: AppServer, socket: AppSocket): Promise<void> {
  const { userId } = socket.data;
  log.info({ socketId: socket.id, userId }, "Socket connected");

  try {
    const conversationIds = await rejoinAllRooms(socket);
    log.debug({ userId, conversationCount: conversationIds.length }, "Rejoined conversation rooms");

    const isFirstConnection = await registerConnection(userId);
    if (isFirstConnection) {
      await syncPresenceToDatabase(userId, true);
      io.to(conversationIds.map(conversationRoom)).emit("user_online", {
        userId,
        lastSeenAt: new Date().toISOString(),
      });
    }

    const onlineUserIds = await getInitialPresenceSnapshot(userId, conversationIds);
    socket.emit("authenticated", { userId, onlineUserIds });

    registerAllHandlers(io, socket);

    socket.on("disconnect", () => {
      void handleDisconnect(io, socket, conversationIds);
    });
  } catch (error) {
    log.error({ error, userId, socketId: socket.id }, "Error during connection setup");
    socket.disconnect(true);
  }
}

/**
 * Every OTHER user, across every conversation this connection just
 * joined, who's online right now — see the `authenticated` event's doc
 * comment (features/websocket/types/socket-events.types.ts) for why this
 * snapshot needs to exist at all. Sequential per-conversation lookups,
 * same tradeoff `sync-engine.ts#pullNewMessagesForAllConversations` makes
 * on the client: this runs once per connection, not on a hot path, so
 * favoring simplicity over a bulk join query is fine here.
 */
async function getInitialPresenceSnapshot(
  userId: string,
  conversationIds: string[],
): Promise<string[]> {
  const otherMemberIds = new Set<string>();

  for (const conversationId of conversationIds) {
    const members = await repositories.conversationMembers.findAllForConversation(conversationId);
    for (const member of members) {
      if (!member.leftAt && member.userId !== userId) otherMemberIds.add(member.userId);
    }
  }

  return getOnlineUserIds(Array.from(otherMemberIds));
}

async function handleDisconnect(
  io: AppServer,
  socket: AppSocket,
  conversationIds: string[],
): Promise<void> {
  const { userId } = socket.data;
  log.info({ socketId: socket.id, userId }, "Socket disconnected");

  try {
    const wasLastConnection = await deregisterConnection(userId);
    if (wasLastConnection) {
      await syncPresenceToDatabase(userId, false);
      const lastSeenAt = new Date().toISOString();
      io.to(conversationIds.map(conversationRoom)).emit("user_offline", { userId, lastSeenAt });
    }
  } catch (error) {
    log.error({ error, userId, socketId: socket.id }, "Error during disconnect cleanup");
  }
}
