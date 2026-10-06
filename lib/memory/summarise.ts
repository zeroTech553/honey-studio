import "server-only";
import { anthropicClient, CHEAP_MODEL } from "@/lib/engine/anthropic-engine";
import type { HoneyRepo, Conversation } from "@/lib/db/types";

export const SUMMARY_EVERY_N_MESSAGES = 40;

export function shouldSummarise(convo: Pick<Conversation, "message_count" | "last_summarised_count">) {
  return (
    convo.message_count - (convo.last_summarised_count ?? 0) >= SUMMARY_EVERY_N_MESSAGES
  );
}

/**
 * Background rolling summary. Runs on the cheap model, merges the previous
 * summary with recent turns, and NEVER blocks the user's reply.
 */
export async function runSummarisation(
  repo: HoneyRepo,
  convo: Conversation,
  companionName: string,
): Promise<void> {
  const api = anthropicClient();
  if (!api) return;

  try {
    const recent = await repo.listMessages(convo.id, 60);
    const transcript = recent
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "User" : companionName}: ${m.content}`)
      .join("\n")
      .slice(-12_000);

    const res = await api.messages.create({
      model: CHEAP_MODEL,
      max_tokens: 450,
      temperature: 0.2,
      system:
        "You maintain a rolling memory summary for an AI companion app. Merge the previous summary with the new transcript into ONE summary of about 200 words. Keep durable, useful things: who the user is, their work/studies, people and pets in their life, ongoing situations, running jokes, preferences, emotional patterns, and where the relationship currently stands. Drop small talk. Write plain prose in the third person, no headings, no bullet points, no preamble.",
      messages: [
        {
          role: "user",
          content: `PREVIOUS SUMMARY:\n${convo.summary?.trim() || "(none)"}\n\nNEW TRANSCRIPT:\n${transcript}\n\nWrite the merged ~200 word summary now.`,
        },
      ],
    });

    const text = res.content
      .filter((b): b is { type: "text"; text: string; citations: never } => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!text) return;

    await repo.updateConversation(convo.id, {
      summary: text.slice(0, 4000),
      last_summarised_count: convo.message_count,
    });
  } catch (err) {
    console.error("[summarise] failed", err instanceof Error ? err.message : err);
  }
}

/** Dedupe + trim memory notes before they are written. */
export function cleanMemoryNotes(notes: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const n of notes) {
    const fact = n.trim().replace(/\s+/g, " ");
    if (fact.length < 4 || fact.length > 200) continue;
    const key = fact.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fact);
    if (out.length >= 3) break;
  }
  return out;
}
