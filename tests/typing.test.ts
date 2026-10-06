import { describe, expect, it } from "vitest";
import {
  TYPING,
  betweenDelay,
  buildTimeline,
  jitter,
  seenDelay,
  thinkDelay,
  totalTimelineMs,
  typingDelayFor,
} from "@/lib/engine/typing";

/** Deterministic rand so timing assertions are stable. */
const fixed = (v: number) => () => v;

const companion = { typingWpm: 45 };

describe("typing delay helpers", () => {
  it("jitter stays inside the window", () => {
    expect(jitter(100, 200, fixed(0))).toBe(100);
    expect(jitter(100, 200, fixed(1))).toBe(200);
    expect(jitter(100, 200, fixed(0.5))).toBe(150);
  });

  it("longer text takes longer to type", () => {
    const short = typingDelayFor("hi", companion, fixed(0.5));
    const long = typingDelayFor(
      "okay so i was walking back from the station and the rain just started",
      companion,
      fixed(0.5),
    );
    expect(long).toBeGreaterThan(short);
  });

  it("clamps to the human-plausible band", () => {
    expect(typingDelayFor("k", companion, fixed(0))).toBeGreaterThanOrEqual(
      TYPING.bubbleMinMs,
    );
    const essay = "word ".repeat(600);
    expect(typingDelayFor(essay, companion, fixed(1))).toBeLessThanOrEqual(
      TYPING.bubbleMaxMs,
    );
  });

  it("a faster typist finishes the same text sooner", () => {
    const text = "i was thinking about you all afternoon honestly";
    const slow = typingDelayFor(text, { typingWpm: 25 }, fixed(0.5));
    const fast = typingDelayFor(text, { typingWpm: 90 }, fixed(0.5));
    expect(fast).toBeLessThan(slow);
  });

  it("seen / think / between delays respect their windows", () => {
    expect(seenDelay(fixed(0))).toBe(TYPING.seenMinMs);
    expect(seenDelay(fixed(1))).toBe(TYPING.seenMaxMs);
    expect(thinkDelay("hey", fixed(0))).toBe(TYPING.thinkMinMs);
    expect(betweenDelay(fixed(0))).toBe(TYPING.betweenMinMs);
    expect(betweenDelay(fixed(1))).toBe(TYPING.betweenMaxMs);
  });
});

describe("buildTimeline", () => {
  it("emits seen → reaction → (typing, bubble)* in order", () => {
    const steps = buildTimeline(
      {
        reaction: "❤️",
        messages: ["one", "two"],
        startCall: null,
      },
      companion,
      fixed(0.5),
    );
    expect(steps.map((s) => s.kind)).toEqual([
      "seen",
      "reaction",
      "typing",
      "bubble",
      "typing",
      "bubble",
    ]);
    expect(steps[1].emoji).toBe("❤️");
    expect(steps[3].text).toBe("one");
    expect(steps[5].text).toBe("two");
  });

  it("skips the reaction step when there is none", () => {
    const steps = buildTimeline(
      { reaction: null, messages: ["hey"], startCall: null },
      companion,
      fixed(0.5),
    );
    expect(steps.some((s) => s.kind === "reaction")).toBe(false);
  });

  it("appends a call step 1.2s after the last bubble", () => {
    const steps = buildTimeline(
      {
        reaction: null,
        messages: ["okay, calling you now 📞"],
        startCall: { reason: "they asked" },
      },
      companion,
      fixed(0.5),
    );
    const last = steps.at(-1)!;
    expect(last.kind).toBe("call");
    expect(last.delayMs).toBe(TYPING.callLeadInMs);
  });

  it("a full turn lands in a believable total duration", () => {
    const steps = buildTimeline(
      { reaction: "😂", messages: ["haha stop", "you're the worst"], startCall: null },
      companion,
      fixed(0.5),
    );
    const total = totalTimelineMs(steps);
    expect(total).toBeGreaterThan(1500);
    expect(total).toBeLessThan(20_000);
  });
});
