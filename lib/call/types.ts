import type { Companion } from "@/lib/companions/types";

export type CallPhase =
  | "idle"
  | "incoming"
  | "outgoing"
  | "connecting"
  | "active"
  | "ending";

export interface CallConnectOptions {
  conversationId: string;
  companion: Companion;
  sessionId: string;
  /** 'user' = the user tapped call, 'companion' = the model triggered it. */
  initiatedBy: "user" | "companion";
}

export interface CallHandle {
  /** Provider-specific room/session identifier. */
  room: string;
  setMuted(muted: boolean): void;
  setSpeaker(on: boolean): void;
  disconnect(): Promise<void>;
  /** Emits "connected" | "disconnected" | "speaking" | "error". */
  on(event: CallEvent, cb: (payload?: unknown) => void): () => void;
}

export type CallEvent = "connected" | "disconnected" | "speaking" | "error";

/**
 * The seam the whole call UI talks to. Phase 2 ships `MockCallProvider`
 * (fully working UI, simulated audio) and `LiveKitCallProvider` (stub,
 * ready for the real voice pipeline).
 */
export interface CallProvider {
  readonly name: string;
  /** Resolves false when the backend isn't configured — UI falls back. */
  isAvailable(conversationId: string): Promise<boolean>;
  connect(opts: CallConnectOptions): Promise<CallHandle>;
}
