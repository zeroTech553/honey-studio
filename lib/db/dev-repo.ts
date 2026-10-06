import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  CallSession,
  CallStatus,
  Conversation,
  HoneyRepo,
  Memory,
  Message,
  Profile,
  SafetyEventRow,
} from "./types";
import { normaliseFact } from "./supabase-repo";

/**
 * DEV-ONLY repository. Mirrors the Supabase schema (including the ownership
 * checks RLS would enforce) in a JSON file so the app runs with no backend
 * credentials. Never selected when NEXT_PUBLIC_SUPABASE_URL is set.
 */

const MAX_MEMORIES = 50;
const FILE = path.join(process.cwd(), ".honey-dev-store.json");

interface Store {
  profiles: Profile[];
  conversations: Conversation[];
  messages: Message[];
  memories: Memory[];
  calls: CallSession[];
  safety: SafetyEventRow[];
  usage: Array<Record<string, unknown>>;
  reports: Array<Record<string, unknown>>;
}

const EMPTY: Store = {
  profiles: [],
  conversations: [],
  messages: [],
  memories: [],
  calls: [],
  safety: [],
  usage: [],
  reports: [],
};

let cache: Store | null = null;

function load(): Store {
  if (cache) return cache;
  try {
    if (fs.existsSync(FILE)) {
      cache = { ...EMPTY, ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
      return cache!;
    }
  } catch {
    /* fall through to empty */
  }
  cache = structuredClone(EMPTY);
  return cache;
}

function save() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
  } catch {
    /* ephemeral filesystem — in-memory is fine */
  }
}

const now = () => new Date().toISOString();

export class DevRepo implements HoneyRepo {
  readonly kind = "dev" as const;

  async getProfile(userId: string) {
    return load().profiles.find((p) => p.id === userId) ?? null;
  }

  async upsertProfile(userId: string, patch: Partial<Profile>) {
    const s = load();
    let p = s.profiles.find((x) => x.id === userId);
    if (!p) {
      p = {
        id: userId,
        display_name: null,
        preferred_gender: null,
        age_confirmed_at: null,
        blocked_companions: [],
        created_at: now(),
      };
      s.profiles.push(p);
    }
    Object.assign(p, patch);
    save();
    return p;
  }

  async listConversations(userId: string) {
    return load()
      .conversations.filter((c) => c.user_id === userId)
      .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
  }

  async getConversation(userId: string, conversationId: string) {
    return (
      load().conversations.find(
        (c) => c.id === conversationId && c.user_id === userId,
      ) ?? null
    );
  }

  async getOrCreateConversation(userId: string, companionId: string) {
    const s = load();
    const found = s.conversations.find(
      (c) => c.user_id === userId && c.companion_id === companionId,
    );
    if (found) return found;
    const c: Conversation = {
      id: randomUUID(),
      user_id: userId,
      companion_id: companionId,
      relationship_stage: 1,
      summary: null,
      message_count: 0,
      days_chatted: 1,
      last_summarised_count: 0,
      last_message_at: null,
      created_at: now(),
    };
    s.conversations.push(c);
    save();
    return c;
  }

  async updateConversation(conversationId: string, patch: Partial<Conversation>) {
    const c = load().conversations.find((x) => x.id === conversationId);
    if (c) Object.assign(c, patch);
    save();
  }

  async deleteConversation(userId: string, conversationId: string) {
    const s = load();
    const idx = s.conversations.findIndex(
      (c) => c.id === conversationId && c.user_id === userId,
    );
    if (idx < 0) return;
    s.conversations.splice(idx, 1);
    s.messages = s.messages.filter((m) => m.conversation_id !== conversationId);
    s.memories = s.memories.filter((m) => m.conversation_id !== conversationId);
    s.calls = s.calls.filter((m) => m.conversation_id !== conversationId);
    save();
  }

  async listMessages(conversationId: string, limit = 200) {
    const all = load()
      .messages.filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return all.slice(-limit);
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
    const s = load();
    const m: Message = {
      id: randomUUID(),
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      reaction: input.reaction ?? null,
      status: input.status ?? "sent",
      meta: input.meta ?? null,
      created_at: input.createdAt ?? now(),
    };
    s.messages.push(m);
    save();
    return m;
  }

  async setMessageReaction(messageId: string, reaction: string | null) {
    const m = load().messages.find((x) => x.id === messageId);
    if (m) m.reaction = reaction;
    save();
  }

  async countMessages(conversationId: string) {
    return load().messages.filter((m) => m.conversation_id === conversationId).length;
  }

  async listMemories(conversationId: string) {
    return load()
      .memories.filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async addMemories(conversationId: string, facts: string[]) {
    const s = load();
    const existing = await this.listMemories(conversationId);
    const seen = new Set(existing.map((m) => normaliseFact(m.fact)));
    const created: Memory[] = [];
    for (const raw of facts) {
      const fact = raw.trim();
      if (fact.length < 3) continue;
      const key = normaliseFact(fact);
      if (seen.has(key)) continue;
      seen.add(key);
      const m: Memory = {
        id: randomUUID(),
        conversation_id: conversationId,
        fact,
        created_at: now(),
      };
      s.memories.push(m);
      created.push(m);
    }
    const all = await this.listMemories(conversationId);
    if (all.length > MAX_MEMORIES) {
      const victims = new Set(all.slice(0, all.length - MAX_MEMORIES).map((m) => m.id));
      s.memories = s.memories.filter((m) => !victims.has(m.id));
    }
    save();
    return created;
  }

  async deleteMemory(userId: string, memoryId: string) {
    const s = load();
    const mem = s.memories.find((m) => m.id === memoryId);
    if (!mem) return;
    const owns = s.conversations.some(
      (c) => c.id === mem.conversation_id && c.user_id === userId,
    );
    if (!owns) return;
    s.memories = s.memories.filter((m) => m.id !== memoryId);
    save();
  }

  async createCallSession(input: {
    conversationId: string;
    initiatedBy: "user" | "companion";
    status?: CallStatus;
  }) {
    const s = load();
    const c: CallSession = {
      id: randomUUID(),
      conversation_id: input.conversationId,
      initiated_by: input.initiatedBy,
      started_at: now(),
      ended_at: null,
      duration_seconds: null,
      status: input.status ?? "active",
    };
    s.calls.push(c);
    save();
    return c;
  }

  async endCallSession(sessionId: string, durationSeconds: number, status: CallStatus) {
    const c = load().calls.find((x) => x.id === sessionId);
    if (c) {
      c.ended_at = now();
      c.duration_seconds = durationSeconds;
      c.status = status;
    }
    save();
  }

  async lastCallSession(conversationId: string) {
    const all = load()
      .calls.filter((c) => c.conversation_id === conversationId)
      .sort((a, b) => a.started_at.localeCompare(b.started_at));
    return all.at(-1) ?? null;
  }

  async logSafetyEvent(input: {
    userId: string;
    conversationId: string | null;
    kind: string;
  }) {
    load().safety.push({
      id: randomUUID(),
      user_id: input.userId,
      conversation_id: input.conversationId,
      kind: input.kind,
      created_at: now(),
    });
    save();
  }

  async logUsage(input: Record<string, unknown>) {
    load().usage.push({ ...input, id: randomUUID(), created_at: now() });
    save();
  }

  async countMessagesToday(userId: string) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    return load().usage.filter(
      (u) => u.userId === userId && String(u.created_at) >= since.toISOString(),
    ).length;
  }

  async createReport(input: Record<string, unknown>) {
    load().reports.push({ ...input, id: randomUUID(), created_at: now() });
    save();
  }

  async deleteAllUserData(userId: string) {
    const s = load();
    const convoIds = new Set(
      s.conversations.filter((c) => c.user_id === userId).map((c) => c.id),
    );
    s.conversations = s.conversations.filter((c) => c.user_id !== userId);
    s.messages = s.messages.filter((m) => !convoIds.has(m.conversation_id));
    s.memories = s.memories.filter((m) => !convoIds.has(m.conversation_id));
    s.calls = s.calls.filter((m) => !convoIds.has(m.conversation_id));
    s.safety = s.safety.filter((m) => m.user_id !== userId);
    s.profiles = s.profiles.filter((p) => p.id !== userId);
    save();
  }
}
