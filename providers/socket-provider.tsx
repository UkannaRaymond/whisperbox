"use client";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/features/websocket/types/socket-events.types";
import { useSession } from "@/lib/auth-client";
import * as React from "react";
import { io, type Socket } from "socket.io-client";

export type SocketStatus = "idle" | "connecting" | "connected" | "disconnected";

type AppClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SocketContextValue {
  socket: AppClientSocket | null;
  status: SocketStatus;
}

const SocketContext = React.createContext<SocketContextValue | null>(null);

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

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: sessionData, isPending: isSessionPending } = useSession();

  const isSignedIn = Boolean(sessionData?.user);

  const [socket, setSocket] = React.useState<AppClientSocket | null>(null);

  const [status, setStatus] = React.useState<SocketStatus>("idle");

  React.useEffect(() => {
    if (isSessionPending || !isSignedIn) {
      return;
    }

    let cancelled = false;
    let socketInstance: AppClientSocket | null = null;

    async function reconnectWithFreshTicket(instance: AppClientSocket) {
      if (cancelled) {
        return;
      }

      try {
        const ticket = await fetchConnectionTicket();

        if (cancelled) {
          return;
        }

        instance.auth = { ticket };
        instance.connect();
      } catch (error) {
        if (!cancelled) {
          console.error("[socket] failed to refresh connection ticket:", error);
        }
      }
    }

    async function connect() {
      setStatus("connecting");

      let ticket: string;

      try {
        ticket = await fetchConnectionTicket();
      } catch (error) {
        if (!cancelled) {
          console.error("[socket] failed to obtain connection ticket:", error);

          setStatus("disconnected");
        }

        return;
      }

      if (cancelled) {
        return;
      }

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
        if (!cancelled) {
          setStatus("connected");
        }
      });

      socketInstance.on("disconnect", (reason) => {
        if (cancelled) {
          return;
        }

        setStatus("disconnected");

        if (reason === "io server disconnect") {
          void reconnectWithFreshTicket(socketInstance!);
        }
      });

      socketInstance.on("reconnect_required", () => {
        void reconnectWithFreshTicket(socketInstance!);
      });

      setSocket(socketInstance);
    }

    void connect();

    return () => {
      cancelled = true;

      socketInstance?.removeAllListeners();
      socketInstance?.disconnect();
    };
  }, [isSessionPending, isSignedIn]);

  const value = React.useMemo<SocketContextValue>(
    () => ({
      socket: isSignedIn ? socket : null,
      status: isSignedIn ? status : "idle",
    }),
    [isSignedIn, socket, status],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const context = React.useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }

  return context;
}
