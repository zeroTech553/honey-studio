import { describe, expect, it } from "vitest";
import {
  extractJsonObject,
  parseStructuredReply,
  stripFences,
  textToBubbles,
} from "@/lib/engine/structured-text";
import { extractCfText, cloudflareRunUrl } from "@/lib/engine/cloudflare-engine";

const GOOD = JSON.stringify({
  reaction: "😂",
  messages: ["arre stop", "you're impossible 🙈"],
  start_call: null,
  memory_notes: ["User is a nurse"],
  mood: "playful",
});

describe("fence + object extraction", () => {
  it("unwraps ```json fences", () => {
    expect(stripFences("```json\n{\"a\":1}\n```")).toBe('{"a":1}');
  });

  it("finds a balanced object inside prose", () => {
    const raw = `Sure! Here you go:\n\n${GOOD}\n\nHope that helps.`;
    expect(extractJsonObject(raw)).toBe(GOOD);
  });

  it("is not confused by braces inside strings", () => {
    const raw = '{"messages":["what a } weird { day"],"mood":"happy"}';
    expect(extractJsonObject(raw)).toBe(raw);
  });

  it("returns null when there is no object", () => {
    expect(extractJsonObject("just a sentence")).toBeNull();
  });
});

describe("parseStructuredReply", () => {
  it("parses a clean contract-following reply", () => {
    const { reply, via } = parseStructuredReply(GOOD);
    expect(via).toBe("json");
    expect(reply!.messages).toHaveLength(2);
    expect(reply!.reaction).toBe("😂");
    expect(reply!.mood).toBe("playful");
    expect(reply!.memoryNotes).toEqual(["User is a nurse"]);
  });

  it("parses it through fences and chatter", () => {
    const { reply, via } = parseStructuredReply("Okay!\n```json\n" + GOOD + "\n```");
    expect(via).toBe("json");
    expect(reply!.messages[0]).toBe("arre stop");
  });

  it("repairs trailing commas", () => {
    const { reply } = parseStructuredReply(
      '{"reaction":null,"messages":["hey",],"start_call":null,"memory_notes":[],"mood":"happy",}',
    );
    expect(reply!.messages).toEqual(["hey"]);
  });

  it("coerces near-miss shapes (string messages, camelCase keys)", () => {
    const { reply, via } = parseStructuredReply(
      '{"reaction":"❤️ ","messages":"i missed you today. tell me everything.","startCall":{"reason":"they asked"},"memoryNotes":["x fact"],"mood":"vibing"}',
    );
    expect(via).toBe("coerced");
    expect(reply!.messages.length).toBeGreaterThan(0);
    expect(reply!.reaction).toBe("❤️");
    expect(reply!.startCall?.reason).toBe("they asked");
    expect(reply!.mood).toBe("happy"); // unknown mood normalised
  });

  it("falls back to prose → bubbles when the model ignores JSON entirely", () => {
    const { reply, via } = parseStructuredReply(
      "hey you! i was just making chai. how did the interview go? i've been thinking about it all morning.",
    );
    expect(via).toBe("prose");
    expect(reply!.messages.length).toBeGreaterThanOrEqual(1);
    expect(reply!.messages.length).toBeLessThanOrEqual(3);
    expect(reply!.startCall).toBeNull();
  });

  it("gives up on an empty completion", () => {
    expect(parseStructuredReply("   ").reply).toBeNull();
    expect(parseStructuredReply("   ").via).toBe("none");
  });
});

describe("textToBubbles", () => {
  it("never exceeds the bubble cap", () => {
    const long = "word ".repeat(400);
    for (const b of textToBubbles(long)) expect(b.length).toBeLessThanOrEqual(220);
  });

  it("caps the bubble count", () => {
    const many = "one. two. three. four. five. six. seven. eight.";
    expect(textToBubbles(many).length).toBeLessThanOrEqual(3);
  });

  it("strips action narration and role prefixes", () => {
    const out = textToBubbles("Assistant: *smiles softly* hey, you're back.").join(" ");
    expect(out).not.toContain("*");
    expect(out.toLowerCase()).not.toContain("assistant:");
    expect(out).toContain("you're back");
  });

  it("returns nothing for empty input", () => {
    expect(textToBubbles("")).toEqual([]);
  });
});

describe("cloudflare response shapes", () => {
  it("reads result.response", () => {
    expect(extractCfText({ result: { response: "hi there" } })).toBe("hi there");
  });

  it("reads an OpenAI-style choices array", () => {
    expect(
      extractCfText({ result: { choices: [{ message: { content: "hello" } }] } }),
    ).toBe("hello");
  });

  it("reads an output/content array", () => {
    expect(
      extractCfText({ result: { output: [{ content: [{ text: "yo" }] }] } }),
    ).toBe("yo");
  });

  it("returns empty string when there is nothing", () => {
    expect(extractCfText({ result: {} })).toBe("");
    expect(extractCfText({})).toBe("");
  });

  it("does not percent-encode the model id in the run URL", () => {
    expect(cloudflareRunUrl("@cf/swiss-ai/apertus-v1.5-8b", "abc123")).toBe(
      "https://api.cloudflare.com/client/v4/accounts/abc123/ai/run/@cf/swiss-ai/apertus-v1.5-8b",
    );
  });
});
