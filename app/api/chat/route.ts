import { NextResponse } from "next/server";
import { after } from "next/server";
import { getRepo } from "@/lib/db";
import { getAuthUser } from "@/lib/auth/session";
import { getCompanion } from "@/lib/companions/data";
import { getEngine } from "@/lib/engine";
import type { EngineMessage } from "@/lib/engine/types";
import { chatRequestSchema, flattenIssues } from "@/lib/validation/schemas";
import {
  checkChatRateLimit,
  FRIENDLY_DAILY_MESSAGE,
  FRIENDLY_LIMIT_MESSAGE,
} from "@/lib/rate-limit";
import { preCheckUserText } from "@/lib/safety/rules";
import { bumpDaysChatted, computeStage } from "@/lib/engine/relationship";
import { cleanMemoryNotes, runSummarisation, shouldSummarise } from "@/lib/memory/summarise";
import { presenceFor } from "@/lib/companions/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HISTORY_WINDOW = 30;

export async function POST(req: Request) {
  const startedAt = Date.now();

  // 1 ─ auth
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 1b ─ validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", issues: flattenIssues(parsed.error) },
      { status: 400 },
    );
  }
  const { conversationId, userText, event } = parsed.data;

  if (!userText.trim() && !event) {
    return NextResponse.json({ error: "empty message" }, { status: 400 });
  }

  // 2 ─ rate limit
  const rl = await checkChatRateLimit(user.id);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: "rate_limited",
        scope: rl.scope,
        message: rl.scope === "day" ? FRIENDLY_DAILY_MESSAGE : FRIENDLY_LIMIT_MESSAGE,
        retryAfter: rl.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const repo = await getRepo();

  // 1c ─ ownership
  const convo = await repo.getConversation(user.id, conversationId);
  if (!convo) {
    return NextResponse.json({ error: "conversation not found" }, { status: 404 });
  }
  const companion = getCompanion(convo.companion_id);
  if (!companion) {
    return NextResponse.json({ error: "companion not found" }, { status: 404 });
  }

  // 3 ─ cheap safety pre-check
  const safety = event ? { event: null, showCrisisCard: false, matchedKinds: [] } : preCheckUserText(userText);
  if (safety.matchedKinds.length) {
    for (const kind of safety.matchedKinds) {
      await repo.logSafetyEvent({
        userId: user.id,
        conversationId: convo.id,
        kind,
      });
    }
  }

  // 4 ─ persist the user message, then load context
  let userMessageId = "";
  if (!event && userText.trim()) {
    const m = await repo.insertMessage({
      conversationId: convo.id,
      role: "user",
      content: userText.trim(),
      status: "seen",
    });
    userMessageId = m.id;
  }

  const [history, memoryRows, lastCall] = await Promise.all([
    repo.listMessages(convo.id, HISTORY_WINDOW),
    repo.listMemories(convo.id),
    repo.lastCallSession(convo.id),
  ]);

  const engineHistory: EngineMessage[] = history
    .filter((m) => !(m.id === userMessageId))
    .map((m) => ({ role: m.role, content: m.content }));

  const profile = await repo.getProfile(user.id);

  // 5 ─ the model call (forced tool use happens inside the engine)
  const engine = getEngine();
  const reply = await engine.reply({
    companion,
    history: engineHistory,
    userText: userText.trim(),
    event,
    summary: convo.summary,
    memories: memoryRows.map((m) => m.fact),
    stage: convo.relationship_stage,
    lastCallInfo: describeLastCall(lastCall),
    safetyEvent: safety.event,
    displayName: profile?.display_name ?? null,
  });

  // 6 ─ persist the companion's side
  if (reply.reaction && userMessageId) {
    await repo.setMessageReaction(userMessageId, reply.reaction);
  }

  const persisted: Array<{ id: string; content: string; createdAt: string }> = [];
  for (const [i, content] of reply.messages.entries()) {
    const m = await repo.insertMessage({
      conversationId: convo.id,
      role: "companion",
      content,
      status: "sent",
      meta: {
        mood: reply.mood,
        order: i,
        ...(reply.degraded ? { degraded: true } : {}),
      },
    });
    persisted.push({ id: m.id, content: m.content, createdAt: m.created_at });
  }

  if (safety.showCrisisCard) {
    await repo.insertMessage({
      conversationId: convo.id,
      role: "system",
      content: "crisis_support",
      meta: { kind: "crisis_card" },
    });
  }

  const notes = cleanMemoryNotes(reply.memoryNotes ?? []);
  if (notes.length) {
    await repo.addMemories(convo.id, notes).catch((e) => console.error("[chat] memories", e));
  }

  // 7 ─ stage + counters
  const messageCount = await repo.countMessages(convo.id);
  const daysChatted = bumpDaysChatted(convo.last_message_at, convo.days_chatted ?? 1);
  const stage = computeStage({
    messageCount,
    daysChatted,
    currentStage: convo.relationship_stage,
  });

  await repo.updateConversation(convo.id, {
    relationship_stage: stage,
    message_count: messageCount,
    days_chatted: daysChatted,
    last_message_at: new Date().toISOString(),
  });

  // token usage for cost monitoring
  const latencyMs = Date.now() - startedAt;
  if (reply.usage) {
    console.info(
      `[usage] user=${user.id.slice(0, 8)} convo=${convo.id.slice(0, 8)} model=${reply.usage.model} in=${reply.usage.inputTokens} out=${reply.usage.outputTokens} cacheRead=${reply.usage.cacheReadTokens} cacheWrite=${reply.usage.cacheCreationTokens} ${latencyMs}ms`,
    );
  }
  await repo
    .logUsage({
      userId: user.id,
      conversationId: convo.id,
      model: reply.usage?.model ?? engine.name,
      inputTokens: reply.usage?.inputTokens ?? 0,
      outputTokens: reply.usage?.outputTokens ?? 0,
      cacheReadTokens: reply.usage?.cacheReadTokens ?? 0,
      cacheCreationTokens: reply.usage?.cacheCreationTokens ?? 0,
      latencyMs,
    })
    .catch(() => {});

  // background summarisation — never blocks the reply
  const updatedConvo = { ...convo, message_count: messageCount };
  if (shouldSummarise(updatedConvo)) {
    after(async () => {
      await runSummarisation(repo, updatedConvo, companion.name);
    });
  }

  return NextResponse.json({
    reaction: reply.reaction,
    messages: persisted,
    startCall: reply.startCall,
    mood: reply.mood,
    stage,
    userMessageId,
    safety: { crisis: safety.showCrisisCard },
    degraded: Boolean(reply.degraded),
    presence: presenceFor(companion).state,
  });
}

function describeLastCall(
  call: { status: string; started_at: string; duration_seconds: number | null } | null,
) {
  if (!call) return "none yet";
  const minsAgo = Math.round((Date.now() - new Date(call.started_at).getTime()) / 60000);
  const when = minsAgo < 1 ? "just now" : minsAgo < 60 ? `${minsAgo} min ago` : `${Math.round(minsAgo / 60)} h ago`;
  if (call.status === "declined") return `declined ${when}`;
  if (call.status === "missed") return `missed ${when}`;
  if (call.status === "completed")
    return `completed ${when}, lasted ${call.duration_seconds ?? 0}s`;
  return `in progress (${when})`;
}
