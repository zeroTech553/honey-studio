import type { Companion } from "@/lib/companions/types";

export type Mood =
  | "happy"
  | "playful"
  | "caring"
  | "sleepy"
  | "shy"
  | "excited"
  | "sad"
  | "flirty";

export type EngineEvent = "call_declined" | "call_ended" | "call_missed";

export interface EngineMessage {
  role: "user" | "companion" | "system";
  content: string;
}

export interface EngineInput {
  companion: Companion;
  /** Oldest → newest, already trimmed to the context window. */
  history: EngineMessage[];
  userText: string;
  event?: EngineEvent;
  summary?: string | null;
  memories?: string[];
  stage: number;
  lastCallInfo?: string;
  /** Set by the code-level safety pre-check. */
  safetyEvent?: SafetyEvent | null;
  displayName?: string | null;
}

export type SafetyEventKind = "self_harm" | "minor_age" | "explicit_request";

export interface SafetyEvent {
  kind: SafetyEventKind;
  instruction: string;
}

export interface EngineReply {
  reaction: string | null;
  messages: string[];
  startCall: { reason: string } | null;
  memoryNotes: string[];
  mood: Mood;
  /** Present when the model/fallback could not be reached. */
  degraded?: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    model: string;
  };
}

/**
 * The single interface every UI component talks to.
 * Phase 1 shipped a mock implementation; Phase 2 swaps in Claude.
 */
export interface CompanionEngine {
  readonly name: string;
  reply(input: EngineInput): Promise<EngineReply>;
}
