"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/features/websocket/types/socket-events.types";

export type SocketStatus = "idle" | "connecting" | "connected" | "disconnected";

type AppClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SocketContextValue {
  socket: AppClientSocket | null;
  status: SocketStatus;
}

const SocketContext = React.createContext<SocketContextValue | null>(null);

/**
 * Fetches a short-lived, single-use connection ticket from the Next.js app
 * itself (same-origin, so the httpOnly Better Auth session cookie is sent
 * automatically) and hands it to the — likely different-origin — Socket.IO
 * server. See server/socket/ticket.service.ts for why a ticket is used
 * instead of forwarding the session cookie directly.
 */
async function fetchConnectionTicket(): Promise<string> {
  const response = await fetch("/api/v1/realtime/ticket", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to obtain a socket connection ticket (${response.status})`);
  }
  const body = await response.json();
  return body.data.ticket as string;
}

/**
 * Socket.IO provider (08-WEBSOCKET.md § Deliverables — client half of
 * "Reconnection strategy"). Connects to `NEXT_PUBLIC_SOCKET_URL` with a
 * fresh ticket, and relies on socket.io-client's built-in reconnection
 * (exponential-ish backoff with jitter) for ordinary network drops.
 *
 * One case socket.io-client's automatic reconnection does NOT cover:
 * `disconnect` with reason `"io server disconnect"` — that means the
 * *server* explicitly called `socket.disconnect()` (e.g. our ticket
 * expired/was invalid), and the client library treats that as
 * intentional, requiring the caller to reconnect manually. This provider
 * handles that case (and the server's own explicit `reconnect_required`
 * event) by fetching a fresh ticket and reconnecting itself.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = React.useState<AppClientSocket | null>(null);
  const [status, setStatus] = React.useState<SocketStatus>("idle");

  React.useEffect(() => {
    let cancelled = false;
    let socketInstance: AppClientSocket | null = null;

    async function connect() {
      setStatus("connecting");

      let ticket: string;
      try {
        ticket = await fetchConnectionTicket();
      } catch {
        if (!cancelled) setStatus("disconnected");
        return;
      }
      if (cancelled) return;

      socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
        auth: { ticket },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
        randomizationFactor: 0.5,
        transports: ["websocket"],
      });

      socketInstance.on("connect", () => {
        if (!cancelled) setStatus("connected");
      });

      socketInstance.on("disconnect", (reason) => {
        if (cancelled) return;
        setStatus("disconnected");

        // socket.io-client won't auto-retry this specific reason — the
        // server deliberately closed the connection (e.g. our ticket was
        // already consumed/expired by the time the handshake completed).
        // Get a new one and reconnect ourselves.
        if (reason === "io server disconnect") {
          void reconnectWithFreshTicket(socketInstance);
        }
      });

      socketInstance.on("reconnect_required", () => {
        void reconnectWithFreshTicket(socketInstance);
      });

      setSocket(socketInstance);
    }

    async function reconnectWithFreshTicket(instance: AppClientSocket | null) {
      if (!instance || cancelled) return;
      try {
        const ticket = await fetchConnectionTicket();
        instance.auth = { ticket };
        instance.connect();
      } catch {
        // Will be retried the next time this handler fires, or on next mount.
      }
    }

    void connect();

    return () => {
      cancelled = true;
      socketInstance?.disconnect();
    };
  }, []);

  const value = React.useMemo<SocketContextValue>(() => ({ socket, status }), [socket, status]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const context = React.useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }

  return context;
}
