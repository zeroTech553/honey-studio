import Anthropic from "@anthropic-ai/sdk";
import type {
  CompanionEngine,
  EngineInput,
  EngineReply,
} from "./types";
import { buildSystemPrompt, makeDynamicCtx } from "./prompt";
import { companionReplySchema } from "@/lib/validation/schemas";

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
export const CHEAP_MODEL =
  process.env.ANTHROPIC_CHEAP_MODEL || "claude-haiku-4-5-20251001";

export const COMPANION_REPLY_TOOL: Anthropic.Tool = {
  name: "companion_reply",
  description:
    "Produce the companion's reply as a small set of chat bubbles plus optional reaction, call trigger and memory notes. Always use this tool.",
  input_schema: {
    type: "object",
    properties: {
      reaction: {
        type: ["string", "null"],
        description:
          "ONE emoji reacting to the user's latest message, or null. Use in about 30% of turns.",
      },
      messages: {
        type: "array",
        items: { type: "string", maxLength: 220 },
        minItems: 1,
        maxItems: 4,
        description:
          "The chat bubbles to send, in order. Each 1-2 short sentences, max ~220 characters.",
      },
      start_call: {
        type: ["object", "null"],
        properties: {
          reason: {
            type: "string",
            description: "A few words on why the call is starting.",
          },
        },
        required: ["reason"],
        description:
          "Set ONLY when the call rules are satisfied, otherwise null.",
      },
      memory_notes: {
        type: "array",
        items: { type: "string" },
        maxItems: 3,
        description:
          "NEW durable facts about the user worth remembering (name, job, pets, preferences). Empty array when nothing new.",
      },
      mood: {
        type: "string",
        enum: [
          "happy",
          "playful",
          "caring",
          "sleepy",
          "shy",
          "excited",
          "sad",
          "flirty",
        ],
      },
    },
    required: ["reaction", "messages", "start_call", "memory_notes", "mood"],
  } as Anthropic.Tool.InputSchema,
};

let client: Anthropic | null = null;
export function anthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 1,
      timeout: 45_000,
    });
  }
  return client;
}

const EVENT_PROMPTS: Record<string, string> = {
  call_declined:
    "[system event] The user declined your call just now. Respond gracefully with zero guilt-tripping.",
  call_ended:
    "[system event] Your voice call with the user just ended. Send a warm 'that was nice' style follow-up.",
  call_missed:
    "[system event] Your call to the user went unanswered. Be light and completely understanding.",
};

function toAnthropicMessages(input: EngineInput): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = [];
  let pending: { role: "user" | "assistant"; parts: string[] } | null = null;

  const push = (role: "user" | "assistant", text: string) => {
    if (!text.trim()) return;
    if (pending && pending.role === role) {
      pending.parts.push(text);
      return;
    }
    if (pending) msgs.push({ role: pending.role, content: pending.parts.join("\n") });
    pending = { role, parts: [text] };
  };

  for (const m of input.history) {
    if (m.role === "user") push("user", m.content);
    else if (m.role === "companion") push("assistant", m.content);
    else push("user", `[system note] ${m.content}`);
  }

  const tail = input.event
    ? EVENT_PROMPTS[input.event] ?? `[system event] ${input.event}`
    : input.userText;
  push("user", tail || "[the user sent an empty message]");

  if (pending) msgs.push({ role: (pending as any).role, content: (pending as any).parts.join("\n") });

  // Anthropic requires the first message to be from the user.
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs;
}

export function fallbackReply(input: EngineInput): EngineReply {
  const lower = input.companion.lowercase;
  const text = lower
    ? "my network is being weird, say that again? 🥺"
    : "My network is being weird — say that again? 🥺";
  return {
    reaction: null,
    messages: [text],
    startCall: null,
    memoryNotes: [],
    mood: "caring",
    degraded: true,
  };
}

export class AnthropicEngine implements CompanionEngine {
  readonly name = "anthropic";

  constructor(private readonly model: string = DEFAULT_MODEL) {}

  async reply(input: EngineInput): Promise<EngineReply> {
    const api = anthropicClient();
    if (!api) return fallbackReply(input);

    const ctx = makeDynamicCtx(input.companion, {
      stage: input.stage,
      summary: input.summary,
      memories: input.memories,
      lastCallInfo: input.lastCallInfo,
      safetyInstruction: input.safetyEvent?.instruction ?? null,
      displayName: input.displayName,
    });
    const { persona, dynamic } = buildSystemPrompt(input.companion, ctx);

    try {
      const res = await api.messages.create({
        model: this.model,
        max_tokens: 700,
        temperature: 0.9,
        system: [
          // Cached: stable persona + rules.
          {
            type: "text",
            text: persona,
            cache_control: { type: "ephemeral" },
          },
          // Uncached: time, stage, summary, memories, safety event.
          { type: "text", text: dynamic },
        ],
        tools: [COMPANION_REPLY_TOOL],
        tool_choice: { type: "tool", name: "companion_reply" },
        messages: toAnthropicMessages(input),
      });

      const block = res.content.find(
        (b): b is Anthropic.ToolUseBlock =>
          b.type === "tool_use" && b.name === "companion_reply",
      );
      if (!block) return fallbackReply(input);

      const parsed = companionReplySchema.safeParse(block.input);
      if (!parsed.success) {
        const salvaged = salvage(block.input);
        if (!salvaged) return fallbackReply(input);
        return { ...salvaged, usage: usageOf(res, this.model) };
      }

      const p = parsed.data;
      return {
        reaction: p.reaction,
        messages: p.messages,
        startCall: p.start_call,
        memoryNotes: p.memory_notes,
        mood: p.mood,
        usage: usageOf(res, this.model),
      };
    } catch (err) {
      console.error("[anthropic-engine] call failed", {
        model: this.model,
        message: err instanceof Error ? err.message : String(err),
      });
      return fallbackReply(input);
    }
  }
}

function usageOf(res: Anthropic.Message, model: string) {
  const u = res.usage as Anthropic.Usage & {
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  };
  return {
    inputTokens: u?.input_tokens ?? 0,
    outputTokens: u?.output_tokens ?? 0,
    cacheReadTokens: u?.cache_read_input_tokens ?? 0,
    cacheCreationTokens: u?.cache_creation_input_tokens ?? 0,
    model,
  };
}

/** Last-ditch coercion when the model returns a slightly off shape. */
function salvage(raw: unknown): EngineReply | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  let messages: string[] = [];
  if (Array.isArray(o.messages)) {
    messages = o.messages
      .filter((m): m is string => typeof m === "string")
      .map((m) => m.trim().slice(0, 400))
      .filter(Boolean)
      .slice(0, 4);
  } else if (typeof o.messages === "string") {
    messages = [o.messages.trim().slice(0, 400)];
  }
  if (!messages.length) return null;

  const reaction =
    typeof o.reaction === "string" && o.reaction.trim().length
      ? o.reaction.trim().slice(0, 8)
      : null;
  const sc = o.start_call as { reason?: unknown } | null | undefined;
  return {
    reaction,
    messages,
    startCall:
      sc && typeof sc === "object"
        ? { reason: String((sc as any).reason ?? "").slice(0, 200) }
        : null,
    memoryNotes: Array.isArray(o.memory_notes)
      ? o.memory_notes.filter((m): m is string => typeof m === "string").slice(0, 3)
      : [],
    mood: "happy",
  };
}
