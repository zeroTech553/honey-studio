import { companionReplySchema } from "@/lib/validation/schemas";
import type { EngineReply } from "./types";

/**
 * Recovery helpers for models WITHOUT forced tool calling (Cloudflare Workers
 * AI, Apertus, most open-weight models). Claude goes through a forced
 * `companion_reply` tool call and never needs any of this.
 *
 * Ladder, most → least faithful:
 *   1. clean fenced/prefixed JSON and parse it
 *   2. extract the first balanced {...} object from prose
 *   3. zod-validate, then coerce near-misses
 *   4. if there is no JSON at all, treat the prose itself as the reply and
 *      split it into believable chat bubbles
 */

/** Strips ```json fences, leading prose, and trailing commentary. */
export function stripFences(raw: string): string {
  let t = (raw ?? "").trim();
  const fence = t.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  return t;
}

/** Returns the first brace-balanced JSON object in the text, if any. */
export function extractJsonObject(raw: string): string | null {
  const t = stripFences(raw);
  const start = t.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return t.slice(start, i + 1);
    }
  }
  return null;
}

const MAX_BUBBLE = 220;

/**
 * Last-resort: turn plain prose into 1-3 chat bubbles so a model that simply
 * "emits text" still produces a usable, human-shaped reply.
 */
export function textToBubbles(raw: string, maxBubbles = 3): string[] {
  const cleaned = stripFences(raw)
    .replace(/^\s*(?:assistant|companion)\s*:\s*/i, "")
    .replace(/\*[^*]{0,80}\*/g, "") // drop *action narration*
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];

  const sentences = cleaned.match(/[^.!?…]+[.!?…]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [
    cleaned,
  ];

  const bubbles: string[] = [];
  let current = "";
  for (const s of sentences) {
    const candidate = current ? `${current} ${s}` : s;
    if (candidate.length <= MAX_BUBBLE) {
      current = candidate;
      // two sentences per bubble feels most human
      if ((current.match(/[.!?…]/g) ?? []).length >= 2) {
        bubbles.push(current);
        current = "";
      }
    } else {
      if (current) bubbles.push(current);
      current = s.length > MAX_BUBBLE ? s.slice(0, MAX_BUBBLE - 1).trimEnd() + "…" : s;
    }
    if (bubbles.length >= maxBubbles) break;
  }
  if (current && bubbles.length < maxBubbles) bubbles.push(current);

  return bubbles.slice(0, maxBubbles).map((b) => b.slice(0, MAX_BUBBLE));
}

export interface ParseOutcome {
  reply: EngineReply | null;
  /** How the reply was recovered — logged for model-quality monitoring. */
  via: "json" | "coerced" | "prose" | "none";
}

/** Parses a free-text model completion into a validated EngineReply. */
export function parseStructuredReply(raw: string): ParseOutcome {
  const jsonText = extractJsonObject(raw);

  if (jsonText) {
    let candidate: unknown = null;
    try {
      candidate = JSON.parse(jsonText);
    } catch {
      // Common small-model slips: trailing commas, single quotes.
      try {
        candidate = JSON.parse(
          jsonText.replace(/,\s*([}\]])/g, "$1").replace(/'/g, '"'),
        );
      } catch {
        candidate = null;
      }
    }

    if (candidate && typeof candidate === "object") {
      const parsed = companionReplySchema.safeParse(candidate);
      if (parsed.success) {
        const p = parsed.data;
        return {
          via: "json",
          reply: {
            reaction: p.reaction,
            messages: p.messages,
            startCall: p.start_call,
            memoryNotes: p.memory_notes,
            mood: p.mood,
          },
        };
      }
      const coerced = coerce(candidate as Record<string, unknown>);
      if (coerced) return { via: "coerced", reply: coerced };
    }
  }

  const bubbles = textToBubbles(raw);
  if (bubbles.length) {
    return {
      via: "prose",
      reply: {
        reaction: null,
        messages: bubbles,
        startCall: null,
        memoryNotes: [],
        mood: "happy",
      },
    };
  }

  return { via: "none", reply: null };
}

const MOODS = new Set([
  "happy",
  "playful",
  "caring",
  "sleepy",
  "shy",
  "excited",
  "sad",
  "flirty",
]);

function coerce(o: Record<string, unknown>): EngineReply | null {
  let messages: string[] = [];
  if (Array.isArray(o.messages)) {
    messages = o.messages
      .filter((m): m is string => typeof m === "string")
      .map((m) => m.trim().slice(0, MAX_BUBBLE))
      .filter(Boolean)
      .slice(0, 4);
  } else if (typeof o.messages === "string") {
    messages = textToBubbles(o.messages);
  } else if (typeof o.message === "string") {
    messages = textToBubbles(o.message);
  } else if (typeof o.response === "string") {
    messages = textToBubbles(o.response);
  }
  if (!messages.length) return null;

  const rawReaction = o.reaction;
  const reaction =
    typeof rawReaction === "string" && rawReaction.trim() && rawReaction.trim() !== "null"
      ? firstGrapheme(rawReaction.trim())
      : null;

  const sc = o.start_call ?? o.startCall;
  const startCall =
    sc && typeof sc === "object"
      ? { reason: String((sc as Record<string, unknown>).reason ?? "").slice(0, 200) }
      : null;

  const notesRaw = o.memory_notes ?? o.memoryNotes;
  const memoryNotes = Array.isArray(notesRaw)
    ? notesRaw.filter((n): n is string => typeof n === "string").slice(0, 3)
    : [];

  const mood =
    typeof o.mood === "string" && MOODS.has(o.mood)
      ? (o.mood as EngineReply["mood"])
      : "happy";

  return { reaction, messages, startCall, memoryNotes, mood };
}

/**
 * First *grapheme cluster*, not first code point — emoji like ❤️ (U+2764
 * U+FE0F) and 👍🏽 are multi-code-point and must not be chopped.
 */
export function firstGrapheme(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    const seg = new Seg("en", { granularity: "grapheme" });
    for (const { segment } of seg.segment(t)) return segment;
    return null;
  }
  // Fallback: code point + any trailing modifiers / ZWJ sequences.
  const m = t.match(
    /^(?:\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*|.)/u,
  );
  return m ? m[0] : Array.from(t)[0] ?? null;
}
