import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CallSession,
  CallStatus,
  Conversation,
  HoneyRepo,
  Memory,
  Message,
  Profile,
} from "./types";

const MAX_MEMORIES = 50;

function must<T>(data: T | null, error: { message: string } | null, what: string): T {
  if (error) throw new Error(`[db] ${what}: ${error.message}`);
  if (data === null) throw new Error(`[db] ${what}: no data returned`);
  return data;
}

export class SupabaseRepo implements HoneyRepo {
  readonly kind = "supabase" as const;

  constructor(private readonly db: SupabaseClient) {}

  // ── profiles ──────────────────────────────────────────────────────
  async getProfile(userId: string) {
    const { data, error } = await this.db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(`[db] getProfile: ${error.message}`);
    return (data as Profile) ?? null;
  }

  async upsertProfile(userId: string, patch: Partial<Profile>) {
    const { data, error } = await this.db
      .from("profiles")
      .upsert({ id: userId, ...patch }, { onConflict: "id" })
      .select("*")
      .single();
    return must(data as Profile, error, "upsertProfile");
  }

  // ── conversations ─────────────────────────────────────────────────
  async listConversations(userId: string) {
    const { data, error } = await this.db
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(`[db] listConversations: ${error.message}`);
    return (data ?? []) as Conversation[];
  }

  async getConversation(userId: string, conversationId: string) {
    const { data, error } = await this.db
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`[db] getConversation: ${error.message}`);
    return (data as Conversation) ?? null;
  }

  async getOrCreateConversation(userId: string, companionId: string) {
    const existing = await this.db
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("companion_id", companionId)
      .maybeSingle();
    if (existing.data) return existing.data as Conversation;

    const { data, error } = await this.db
      .from("conversations")
      .upsert(
        { user_id: userId, companion_id: companionId },
        { onConflict: "user_id,companion_id" },
      )
      .select("*")
      .single();
    return must(data as Conversation, error, "getOrCreateConversation");
  }

  async updateConversation(conversationId: string, patch: Partial<Conversation>) {
    const { error } = await this.db
      .from("conversations")
      .update(patch)
      .eq("id", conversationId);
    if (error) throw new Error(`[db] updateConversation: ${error.message}`);
  }

  async deleteConversation(userId: string, conversationId: string) {
    const { error } = await this.db
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId);
    if (error) throw new Error(`[db] deleteConversation: ${error.message}`);
  }

  // ── messages ──────────────────────────────────────────────────────
  async listMessages(conversationId: string, limit = 200) {
    const { data, error } = await this.db
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`[db] listMessages: ${error.message}`);
    return ((data ?? []) as Message[]).reverse();
  }

  async insertMessage(input: {
    conversationId: string;
    role: Message["role"];
    content: string;
    status?: Message["status"];
    reaction?: string | null;
    meta?: Record<string, unknown> | null;
    createdAt?: string;
  }) {
    const row: Record<string, unknown> = {
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      status: input.status ?? "sent",
      reaction: input.reaction ?? null,
      meta: input.meta ?? null,
    };
    if (input.createdAt) row.created_at = input.createdAt;

    const { data, error } = await this.db
      .from("messages")
      .insert(row)
      .select("*")
      .single();
    return must(data as Message, error, "insertMessage");
  }

  async setMessageReaction(messageId: string, reaction: string | null) {
    const { error } = await this.db
      .from("messages")
      .update({ reaction })
      .eq("id", messageId);
    if (error) throw new Error(`[db] setMessageReaction: ${error.message}`);
  }

  async countMessages(conversationId: string) {
    const { count, error } = await this.db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId);
    if (error) throw new Error(`[db] countMessages: ${error.message}`);
    return count ?? 0;
  }

  // ── memories ──────────────────────────────────────────────────────
  async listMemories(conversationId: string) {
    const { data, error } = await this.db
      .from("memories")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`[db] listMemories: ${error.message}`);
    return (data ?? []) as Memory[];
  }

  async addMemories(conversationId: string, facts: string[]) {
    if (!facts.length) return [];
    const existing = await this.listMemories(conversationId);
    const seen = new Set(existing.map((m) => normaliseFact(m.fact)));
    const fresh = facts
      .map((f) => f.trim())
      .filter((f) => f.length > 2 && !seen.has(normaliseFact(f)));
    if (!fresh.length) return [];

    const { data, error } = await this.db
      .from("memories")
      .insert(fresh.map((fact) => ({ conversation_id: conversationId, fact })))
      .select("*");
    if (error) throw new Error(`[db] addMemories: ${error.message}`);

    // Evict oldest beyond the cap.
    const total = existing.length + fresh.length;
    if (total > MAX_MEMORIES) {
      const overflow = total - MAX_MEMORIES;
      const victims = existing.slice(0, overflow).map((m) => m.id);
      if (victims.length) {
        await this.db.from("memories").delete().in("id", victims);
      }
    }
    return (data ?? []) as Memory[];
  }

  async deleteMemory(userId: string, memoryId: string) {
    // RLS restricts this to memories inside the user's own conversations.
    const { error } = await this.db.from("memories").delete().eq("id", memoryId);
    if (error) throw new Error(`[db] deleteMemory: ${error.message}`);
  }

  // ── calls ─────────────────────────────────────────────────────────
  async createCallSession(input: {
    conversationId: string;
    initiatedBy: "user" | "companion";
    status?: CallStatus;
  }) {
    const { data, error } = await this.db
      .from("call_sessions")
      .insert({
        conversation_id: input.conversationId,
        initiated_by: input.initiatedBy,
        status: input.status ?? "active",
      })
      .select("*")
      .single();
    return must(data as CallSession, error, "createCallSession");
  }

  async endCallSession(sessionId: string, durationSeconds: number, status: CallStatus) {
    const { error } = await this.db
      .from("call_sessions")
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        status,
      })
      .eq("id", sessionId);
    if (error) throw new Error(`[db] endCallSession: ${error.message}`);
  }

  async lastCallSession(conversationId: string) {
    const { data, error } = await this.db
      .from("call_sessions")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`[db] lastCallSession: ${error.message}`);
    return (data as CallSession) ?? null;
  }

  // ── safety / usage / reports ──────────────────────────────────────
  async logSafetyEvent(input: {
    userId: string;
    conversationId: string | null;
    kind: string;
  }) {
    const { error } = await this.db.from("safety_events").insert({
      user_id: input.userId,
      conversation_id: input.conversationId,
      kind: input.kind,
    });
    if (error) console.error("[db] logSafetyEvent", error.message);
  }

  async logUsage(input: {
    userId: string;
    conversationId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    latencyMs: number;
  }) {
    const { error } = await this.db.from("usage_events").insert({
      user_id: input.userId,
      conversation_id: input.conversationId,
      model: input.model,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      cache_read_tokens: input.cacheReadTokens,
      cache_creation_tokens: input.cacheCreationTokens,
      latency_ms: input.latencyMs,
    });
    if (error) console.error("[db] logUsage", error.message);
  }

  async countMessagesToday(userId: string) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count, error } = await this.db
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since.toISOString());
    if (error) return 0;
    return count ?? 0;
  }

  async createReport(input: {
    userId: string;
    conversationId: string;
    category: string;
    reason: string;
  }) {
    const { error } = await this.db.from("reports").insert({
      user_id: input.userId,
      conversation_id: input.conversationId,
      category: input.category,
      reason: input.reason,
    });
    if (error) throw new Error(`[db] createReport: ${error.message}`);
  }

  async deleteAllUserData(userId: string) {
    // conversations cascade into messages / memories / call_sessions.
    await this.db.from("conversations").delete().eq("user_id", userId);
    await this.db.from("safety_events").delete().eq("user_id", userId);
    await this.db.from("reports").delete().eq("user_id", userId);
    await this.db.from("profiles").delete().eq("id", userId);
  }
}

export function normaliseFact(f: string) {
  return f
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
