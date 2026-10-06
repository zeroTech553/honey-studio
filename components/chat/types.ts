export type ClientMessageStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "seen"
  | "failed";

export interface ChatMessage {
  id: string;
  role: "user" | "companion" | "system";
  content: string;
  reaction: string | null;
  status: ClientMessageStatus;
  meta?: Record<string, unknown> | null;
  created_at: string;
}
