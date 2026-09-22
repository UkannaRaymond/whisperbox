import type { Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketMessagePayload,
} from "@/features/websocket/types/socket-events.types";
import type { CreateMessageDto } from "@/schemas/message.schema";

export type AppClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const SOCKET_SEND_TIMEOUT_MS = 5_000;

export class SocketAckTimeoutError extends Error {
  constructor(message = "send_message ack timed out") {
    super(message);
    this.name = "SocketAckTimeoutError";
  }
}

export function sendMessageOverSocket(
  socket: AppClientSocket,
  payload: CreateMessageDto,
): Promise<{ ok: true; message: SocketMessagePayload } | { ok: false; error: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new SocketAckTimeoutError());
    }, SOCKET_SEND_TIMEOUT_MS);

    socket.emit("send_message", payload, (result) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}
