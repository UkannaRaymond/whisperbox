import type { Server, Socket } from "socket.io";
import { createLogger } from "../logger";
import { consumeSocketTicket } from "./ticket.service";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "../../features/websocket/types/socket-events.types";

const log = createLogger("socket:auth");

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Socket.IO authentication middleware (08-WEBSOCKET.md: "Socket
 * authentication"). Runs once per connection attempt, before any event
 * handler fires. Rejects the connection outright (via `next(error)`) if no
 * valid, unused ticket is presented — there is no "connected but
 * unauthenticated" state in this gateway.
 *
 * See ticket.service.ts for why this uses a short-lived ticket instead of
 * forwarding the Better Auth session cookie directly.
 */
export async function socketAuthMiddleware(
  socket: AppSocket,
  next: (err?: Error) => void,
): Promise<void> {
  const ticket = socket.handshake.auth?.ticket ?? socket.handshake.query?.ticket;

  if (!ticket || typeof ticket !== "string") {
    log.warn({ socketId: socket.id }, "Connection rejected: no ticket presented");
    next(new Error("UNAUTHORIZED: missing connection ticket"));
    return;
  }

  const userId = await consumeSocketTicket(ticket);

  if (!userId) {
    log.warn({ socketId: socket.id }, "Connection rejected: invalid or expired ticket");
    next(new Error("UNAUTHORIZED: invalid or expired connection ticket"));
    return;
  }

  socket.data.userId = userId;
  log.info({ socketId: socket.id, userId }, "Socket authenticated");
  next();
}
