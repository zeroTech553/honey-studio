import type { Companion } from "@/lib/companions/types";

/**
 * Human-like timing helpers. The server never streams raw text — the client
 * replays a structured reply with these delays so it *feels* typed.
 */

export const TYPING = {
  /** How long before the companion "sees" the message (ticks turn blue). */
  seenMinMs: 350,
  seenMaxMs: 1400,
  /** Pause before the first typing indicator appears. */
  thinkMinMs: 500,
  thinkMaxMs: 2200,
  /** Pause between consecutive bubbles. */
  betweenMinMs: 350,
  betweenMaxMs: 1100,
  /** Floor/ceiling on a single bubble's typing time. */
  bubbleMinMs: 700,
  bubbleMaxMs: 6500,
  /** Delay between the last bubble and an LLM-triggered incoming call. */
  callLeadInMs: 1200,
} as const;

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Deterministic when `rand` is supplied — keeps the unit tests honest. */
export function jitter(min: number, max: number, rand: () => number = Math.random) {
  return Math.round(min + rand() * (max - min));
}

/**
 * Time to "type" one bubble, from the companion's words-per-minute and the
 * text length, plus a little human variance.
 */
export function typingDelayFor(
  text: string,
  companion: Pick<Companion, "typingWpm">,
  rand: () => number = Math.random,
): number {
  const words = Math.max(1, text.trim().split(/\s+/).length);
  const wpm = clamp(companion.typingWpm || 45, 20, 120);
  const baseMs = (words / wpm) * 60_000;
  // Humans pause on punctuation and emoji.
  const punctuation = (text.match(/[.,!?…]/g) ?? []).length * 110;
  const variance = 0.78 + rand() * 0.5; // 0.78×..1.28×
  return Math.round(clamp((baseMs + punctuation) * variance, TYPING.bubbleMinMs, TYPING.bubbleMaxMs));
}

export function seenDelay(rand: () => number = Math.random) {
  return jitter(TYPING.seenMinMs, TYPING.seenMaxMs, rand);
}

export function thinkDelay(
  firstBubble: string,
  rand: () => number = Math.random,
) {
  // Longer first replies get a slightly longer "reading" pause.
  const weight = clamp(firstBubble.length / 180, 0, 1);
  const min = TYPING.thinkMinMs;
  const max = TYPING.thinkMinMs + (TYPING.thinkMaxMs - TYPING.thinkMinMs) * (0.45 + weight * 0.55);
  return jitter(min, max, rand);
}

export function betweenDelay(rand: () => number = Math.random) {
  return jitter(TYPING.betweenMinMs, TYPING.betweenMaxMs, rand);
}

export interface TimedStep {
  kind: "seen" | "reaction" | "typing" | "bubble" | "call";
  /** Delay *before* this step fires, in ms. */
  delayMs: number;
  text?: string;
  emoji?: string;
}

/**
 * Builds the full timeline the chat screen replays for one engine reply.
 * Pure + deterministic with an injected rand, so it is unit-testable.
 */
export function buildTimeline(
  reply: { reaction: string | null; messages: string[]; startCall: { reason: string } | null },
  companion: Pick<Companion, "typingWpm">,
  rand: () => number = Math.random,
): TimedStep[] {
  const steps: TimedStep[] = [];
  steps.push({ kind: "seen", delayMs: seenDelay(rand) });

  if (reply.reaction) {
    steps.push({ kind: "reaction", delayMs: jitter(250, 900, rand), emoji: reply.reaction });
  }

  reply.messages.forEach((text, i) => {
    const think = i === 0 ? thinkDelay(text, rand) : betweenDelay(rand);
    steps.push({ kind: "typing", delayMs: think });
    steps.push({ kind: "bubble", delayMs: typingDelayFor(text, companion, rand), text });
  });

  if (reply.startCall) {
    steps.push({ kind: "call", delayMs: TYPING.callLeadInMs });
  }

  return steps;
}

export function totalTimelineMs(steps: TimedStep[]) {
  return steps.reduce((a, s) => a + s.delayMs, 0);
}
