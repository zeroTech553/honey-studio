import { describe, expect, it } from "vitest";
import {
  chatRequestSchema,
  companionReplySchema,
} from "@/lib/validation/schemas";

const valid = {
  reaction: "❤️",
  messages: ["hey you", "how was the interview??"],
  start_call: null,
  memory_notes: ["User had a job interview on Tuesday"],
  mood: "excited",
};

describe("companion_reply schema", () => {
  it("accepts a well-formed tool payload", () => {
    const r = companionReplySchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.messages).toHaveLength(2);
      expect(r.data.reaction).toBe("❤️");
      expect(r.data.start_call).toBeNull();
    }
  });

  it("normalises a missing / empty reaction to null", () => {
    expect(companionReplySchema.parse({ ...valid, reaction: "" }).reaction).toBeNull();
    expect(
      companionReplySchema.parse({ ...valid, reaction: undefined }).reaction,
    ).toBeNull();
  });

  it("defaults memory_notes and mood", () => {
    const r = companionReplySchema.parse({
      reaction: null,
      messages: ["ok"],
      start_call: null,
    });
    expect(r.memory_notes).toEqual([]);
    expect(r.mood).toBe("happy");
  });

  it("rejects zero bubbles and more than four", () => {
    expect(companionReplySchema.safeParse({ ...valid, messages: [] }).success).toBe(false);
    expect(
      companionReplySchema.safeParse({ ...valid, messages: ["a", "b", "c", "d", "e"] })
        .success,
    ).toBe(false);
  });

  it("rejects essay-length bubbles", () => {
    expect(
      companionReplySchema.safeParse({ ...valid, messages: ["x".repeat(401)] }).success,
    ).toBe(false);
  });

  it("rejects an unknown mood", () => {
    expect(companionReplySchema.safeParse({ ...valid, mood: "menacing" }).success).toBe(
      false,
    );
  });

  it("parses a start_call object", () => {
    const r = companionReplySchema.parse({
      ...valid,
      start_call: { reason: "they asked to hear my voice" },
    });
    expect(r.start_call?.reason).toBe("they asked to hear my voice");
  });

  it("caps memory_notes at three", () => {
    expect(
      companionReplySchema.safeParse({
        ...valid,
        memory_notes: ["a fact", "b fact", "c fact", "d fact"],
      }).success,
    ).toBe(false);
  });
});

describe("chat request schema", () => {
  it("requires a conversation id", () => {
    expect(chatRequestSchema.safeParse({ userText: "hi" }).success).toBe(false);
  });

  it("accepts an event-only request", () => {
    const r = chatRequestSchema.safeParse({
      conversationId: "11111111-1111-4111-8111-111111111111",
      event: "call_declined",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.userText).toBe("");
  });

  it("rejects an unknown event", () => {
    expect(
      chatRequestSchema.safeParse({
        conversationId: "11111111-1111-4111-8111-111111111111",
        event: "call_exploded",
      }).success,
    ).toBe(false);
  });
});
