export type MessageRole = "user" | "companion" | "system";
export type MessageStatus = "sent" | "delivered" | "seen";
export type CallStatus = "declined" | "completed" | "missed" | "active";

export interface Profile {
  id: string;
  display_name: string | null;
  preferred_gender: "girlfriend" | "boyfriend" | null;
  age_confirmed_at: string | null;
  blocked_companions: string[];
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  companion_id: string;
  relationship_stage: number;
  summary: string | null;
  message_count: number;
  days_chatted: number;
  last_summarised_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  reaction: string | null;
  status: MessageStatus;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface Memory {
  id: string;
  conversation_id: string;
  fact: string;
  created_at: string;
}

export interface CallSession {
  id: string;
  conversation_id: string;
  initiated_by: "user" | "companion";
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: CallStatus;
}

export interface SafetyEventRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  kind: string;
  created_at: string;
}

export interface HoneyRepo {
  readonly kind: "supabase" | "dev";

  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(
    userId: string,
    patch: Partial<
      Pick<
        Profile,
        "display_name" | "preferred_gender" | "age_confirmed_at" | "blocked_companions"
      >
    >,
  ): Promise<Profile>;

  listConversations(userId: string): Promise<Conversation[]>;
  getConversation(userId: string, conversationId: string): Promise<Conversation | null>;
  getOrCreateConversation(userId: string, companionId: string): Promise<Conversation>;
  updateConversation(
    conversationId: string,
    patch: Partial<
      Pick<
        Conversation,
        | "relationship_stage"
        | "summary"
        | "last_message_at"
        | "message_count"
        | "days_chatted"
        | "last_summarised_count"
      >
    >,
  ): Promise<void>;
  deleteConversation(userId: string, conversationId: string): Promise<void>;

  listMessages(conversationId: string, limit?: number): Promise<Message[]>;
  insertMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
    status?: MessageStatus;
    reaction?: string | null;
    meta?: Record<string, unknown> | null;
    createdAt?: string;
  }): Promise<Message>;
  setMessageReaction(messageId: string, reaction: string | null): Promise<void>;
  countMessages(conversationId: string): Promise<number>;

  listMemories(conversationId: string): Promise<Memory[]>;
  addMemories(conversationId: string, facts: string[]): Promise<Memory[]>;
  deleteMemory(userId: string, memoryId: string): Promise<void>;

  createCallSession(input: {
    conversationId: string;
    initiatedBy: "user" | "companion";
    status?: CallStatus;
  }): Promise<CallSession>;
  endCallSession(
    sessionId: string,
    durationSeconds: number,
    status: CallStatus,
  ): Promise<void>;
  lastCallSession(conversationId: string): Promise<CallSession | null>;

  logSafetyEvent(input: {
    userId: string;
    conversationId: string | null;
    kind: string;
  }): Promise<void>;

  logUsage(input: {
    userId: string;
    conversationId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    latencyMs: number;
  }): Promise<void>;

  countMessagesToday(userId: string): Promise<number>;

  createReport(input: {
    userId: string;
    conversationId: string;
    category: string;
    reason: string;
  }): Promise<void>;

  deleteAllUserData(userId: string): Promise<void>;
}
