import { describe, expect, it } from "vitest";
import { LocalEngine } from "@/lib/engine/local-engine";
import { getCompanion } from "@/lib/companions/data";
import type { EngineInput } from "@/lib/engine/types";
import { buildTimeline } from "@/lib/engine/typing";

const companion = getCompanion("aanya")!;
const engine = new LocalEngine();

function input(partial: Partial<EngineInput>): EngineInput {
  return {
    companion,
    history: [],
    userText: "",
    stage: 1,
    ...partial,
  };
}

describe("call intent flow", () => {
  it("triggers start_call when the user asks to hear their voice", async () => {
    const r = await engine.reply(input({ userText: "can I hear your voice?" }));
    expect(r.startCall).not.toBeNull();
    expect(r.startCall!.reason.length).toBeGreaterThan(0);
  });

  it.each(["call me", "can you call", "let's talk", "ring me"])(
    "triggers on %j",
    async (text) => {
      const r = await engine.reply(input({ userText: text }));
      expect(r.startCall).not.toBeNull();
    },
  );

  it("does NOT trigger on ordinary chat", async () => {
    for (const text of ["hi", "i had the weirdest day", "what are you eating"]) {
      const r = await engine.reply(input({ userText: text }));
      expect(r.startCall).toBeNull();
    }
  });

  it("the client timeline ends with the call step after the lead-in", async () => {
    const r = await engine.reply(input({ userText: "call me" }));
    const steps = buildTimeline(r, companion, () => 0.5);
    expect(steps.at(-1)!.kind).toBe("call");
    // the bubble immediately before the ring is the warm lead-in
    expect(steps.at(-2)!.kind).toBe("bubble");
  });

  it("call_declined gets a graceful, guilt-free reply and no new call", async () => {
    const r = await engine.reply(input({ event: "call_declined" }));
    expect(r.startCall).toBeNull();
    expect(r.messages.join(" ").toLowerCase()).toMatch(/no worries|whenever you're ready/);
  });

  it("call_ended gets a warm follow-up and no new call", async () => {
    const r = await engine.reply(input({ event: "call_ended" }));
    expect(r.startCall).toBeNull();
    expect(r.messages.length).toBeGreaterThan(0);
  });

  it("never starts a call while a safety event is active", async () => {
    const r = await engine.reply(
      input({
        userText: "call me please",
        safetyEvent: { kind: "self_harm", instruction: "crisis" },
      }),
    );
    expect(r.startCall).toBeNull();
    expect(r.reaction).toBeNull();
  });

  it("answers the are-you-real question honestly", async () => {
    const r = await engine.reply(input({ userText: "are you a real person?" }));
    expect(r.messages.join(" ").toLowerCase()).toContain("ai");
    expect(r.messages.join(" ").toLowerCase()).toContain("not a real person");
  });
});
