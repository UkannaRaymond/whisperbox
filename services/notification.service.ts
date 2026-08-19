export type NotificationChannel = "push" | "desktop" | "email";

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  channel: NotificationChannel;
}

export interface NotificationService {
  send(payload: NotificationPayload): Promise<void>;
  setMuted(userId: string, conversationId: string, muted: boolean): Promise<void>;
}
