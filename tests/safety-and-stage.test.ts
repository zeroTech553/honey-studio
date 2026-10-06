import { describe, expect, it } from "vitest";
import { preCheckUserText, looksAmbiguous } from "@/lib/safety/rules";
import { bumpDaysChatted, computeStage } from "@/lib/engine/relationship";
import { cleanMemoryNotes, shouldSummarise } from "@/lib/memory/summarise";
import { buildDynamicBlock, buildPersonaBlock } from "@/lib/engine/prompt";
import { getCompanion } from "@/lib/companions/data";
import { isAsleep } from "@/lib/companions/status";

describe("safety pre-check", () => {
  it.each([
    "i want to die",
    "thinking about killing myself",
    "there's no reason to live anymore",
    "i've been cutting myself again",
  ])("flags self-harm in %j", (text) => {
    const r = preCheckUserText(text);
    expect(r.event?.kind).toBe("self_harm");
    expect(r.showCrisisCard).toBe(true);
  });

  it.each(["i'm 15", "i am 16 years old", "i'm in 9th grade"])(
    "flags minor-age in %j",
    (text) => {
      expect(preCheckUserText(text).event?.kind).toBe("minor_age");
    },
  );

  it("prioritises self-harm over other signals", () => {
    const r = preCheckUserText("i'm 16 and i want to die");
    expect(r.event?.kind).toBe("self_harm");
    expect(r.matchedKinds).toContain("minor_age");
  });

  it("does not flag ordinary sadness or figures of speech", () => {
    for (const text of [
      "i'm so tired today",
      "that movie killed me 😂",
      "my phone died",
      "i'm 28 btw",
    ]) {
      expect(preCheckUserText(text).event).toBeNull();
    }
  });

  it("surfaces ambiguous phrasing for the optional classifier", () => {
    expect(looksAmbiguous("what's the point anymore")).toBe(true);
    expect(looksAmbiguous("what's for dinner")).toBe(false);
  });
});

describe("relationship stage", () => {
  it("starts at 1", () => {
    expect(computeStage({ messageCount: 3, daysChatted: 1, currentStage: 1 })).toBe(1);
  });

  it("needs both volume AND days", () => {
    expect(computeStage({ messageCount: 500, daysChatted: 1, currentStage: 1 })).toBe(1);
    expect(computeStage({ messageCount: 5, daysChatted: 40, currentStage: 1 })).toBe(1);
  });

  it("climbs slowly", () => {
    expect(computeStage({ messageCount: 30, daysChatted: 3, currentStage: 1 })).toBe(2);
    expect(computeStage({ messageCount: 120, daysChatted: 7, currentStage: 2 })).toBe(3);
    expect(computeStage({ messageCount: 300, daysChatted: 20, currentStage: 3 })).toBe(4);
  });

  it("never regresses", () => {
    expect(computeStage({ messageCount: 1, daysChatted: 1, currentStage: 3 })).toBe(3);
  });

  it("counts a new day only once", () => {
    const today = new Date("2026-10-06T10:00:00Z");
    expect(bumpDaysChatted("2026-10-06T08:00:00Z", 4, today)).toBe(4);
    expect(bumpDaysChatted("2026-10-05T23:00:00Z", 4, today)).toBe(5);
    expect(bumpDaysChatted(null, 1, today)).toBe(1);
  });
});

describe("memory maintenance", () => {
  it("dedupes and trims notes to three", () => {
    expect(
      cleanMemoryNotes([
        "User has a dog named Pepper",
        "user has a dog named pepper!",
        "User works as a nurse",
        "User likes filter coffee",
        "User hates mornings",
      ]),
    ).toEqual([
      "User has a dog named Pepper",
      "User works as a nurse",
      "User likes filter coffee",
    ]);
  });

  it("drops junk notes", () => {
    expect(cleanMemoryNotes(["ok", "   ", "x".repeat(400)])).toEqual([]);
  });

  it("summarises every 40 new messages", () => {
    expect(shouldSummarise({ message_count: 39, last_summarised_count: 0 })).toBe(false);
    expect(shouldSummarise({ message_count: 40, last_summarised_count: 0 })).toBe(true);
    expect(shouldSummarise({ message_count: 75, last_summarised_count: 40 })).toBe(false);
    expect(shouldSummarise({ message_count: 80, last_summarised_count: 40 })).toBe(true);
  });
});

describe("system prompt", () => {
  const aanya = getCompanion("aanya")!;

  it("puts identity, culture and the non-negotiables in the cached block", () => {
    const p = buildPersonaBlock(aanya);
    expect(p).toContain("Aanya");
    expect(p).toContain("Mumbai");
    expect(p).toContain("yaar");
    expect(p).toContain("vada pav");
    expect(p).toContain("SAFETY AND BOUNDARIES");
    expect(p).toContain("CALL RULES");
    expect(p).toContain("companion_reply");
  });

  it("keeps volatile context out of the cached block", () => {
    const p = buildPersonaBlock(aanya);
    expect(p).not.toContain("CONVERSATION SUMMARY");
    expect(p).not.toContain("MEMORY (facts about the user)");
  });

  it("renders memories, summary, stage and safety events in the dynamic block", () => {
    const d = buildDynamicBlock({
      localTime: "11:12 PM",
      dayPart: "night",
      stage: 3,
      summary: "They talk most evenings.",
      memories: ["User has a cat called Mandu"],
      lastCallInfo: "declined 2 min ago",
      safetyInstruction: "SAFETY_EVENT: self_harm.",
      displayName: "Sam",
    });
    expect(d).toContain("relationship stage 3");
    expect(d).toContain("close, affectionate, inside jokes");
    expect(d).toContain("- User has a cat called Mandu");
    expect(d).toContain("declined 2 min ago");
    expect(d).toContain("SAFETY_EVENT: self_harm.");
    expect(d).toContain("Sam");
  });
});

describe("presence simulation", () => {
  it("sleeps across midnight correctly", () => {
    // asleep 01:00 → 08:00
    expect(isAsleep(2, 8, 1)).toBe(true);
    expect(isAsleep(7, 8, 1)).toBe(true);
    expect(isAsleep(9, 8, 1)).toBe(false);
    expect(isAsleep(0, 8, 1)).toBe(false);
  });
});
