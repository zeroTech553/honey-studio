import type { CompanionEngine, EngineInput, EngineReply } from "./types";
import { buildSystemPrompt, makeDynamicCtx } from "./prompt";
import { parseStructuredReply } from "./structured-text";

/**
 * Cloudflare Workers AI engine.
 *
 * Implements the same CompanionEngine interface as AnthropicEngine, so the
 * chat route, the typing timeline and every component are untouched.
 *
 * Difference from Claude: most Workers AI models (including
 * @cf/swiss-ai/apertus-v1.5-8b) do not support a FORCED tool call, so the
 * structured contract is carried in the prompt and recovered by
 * lib/engine/structured-text.ts. If the model returns prose instead of JSON,
 * the prose is split into chat bubbles rather than failing the turn.
 */

export const CF_DEFAULT_MODEL =
  process.env.CLOUDFLARE_AI_MODEL || "@cf/swiss-ai/apertus-v1.5-8b";

export function cloudflareConfigured() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN,
  );
}

export function cloudflareRunUrl(model: string, accountId: string) {
  // Model ids contain '@' and '/' and must NOT be percent-encoded here.
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
}

export interface CfChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CfRunResponse {
  success?: boolean;
  errors?: Array<{ code: number; message: string }>;
  result?: {
    response?: string;
    // some models answer in an OpenAI-ish shape
    choices?: Array<{ message?: { content?: string }; text?: string }>;
    output?: Array<{ content?: Array<{ text?: string }> }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
}

/** Pulls the assistant text out of whichever shape Workers AI returns. */
export function extractCfText(data: CfRunResponse): string {
  const r = data?.result;
  if (!r) return "";
  if (typeof r.response === "string" && r.response.trim()) return r.response;

  const choice = r.choices?.[0];
  if (choice?.message?.content) return choice.message.content;
  if (choice?.text) return choice.text;

  const out = r.output?.[0]?.content?.map((c) => c.text ?? "").join("") ?? "";
  return out;
}

function toCfMessages(input: EngineInput, system: string): CfChatMessage[] {
  const msgs: CfChatMessage[] = [{ role: "system", content: system }];

  for (const m of input.history) {
    if (m.role === "user") msgs.push({ role: "user", content: m.content });
    else if (m.role === "companion") msgs.push({ role: "assistant", content: m.content });
    else msgs.push({ role: "user", content: `[system note] ${m.content}` });
  }

  const EVENTS: Record<string, string> = {
    call_declined:
      "[system event] The user declined your call just now. Respond gracefully with zero guilt-tripping.",
    call_ended:
      "[system event] Your voice call with the user just ended. Send a warm 'that was nice' style follow-up.",
    call_missed:
      "[system event] Your call to the user went unanswered. Be light and completely understanding.",
  };

  const tail = input.event
    ? (EVENTS[input.event] ?? `[system event] ${input.event}`)
    : input.userText;
  msgs.push({ role: "user", content: tail || "[the user sent an empty message]" });

  return msgs;
}

function fallbackReply(input: EngineInput): EngineReply {
  return {
    reaction: null,
    messages: [
      input.companion.lowercase
        ? "my network is being weird, say that again? 🥺"
        : "My network is being weird — say that again? 🥺",
    ],
    startCall: null,
    memoryNotes: [],
    mood: "caring",
    degraded: true,
  };
}

export class CloudflareEngine implements CompanionEngine {
  readonly name = "cloudflare";

  constructor(private readonly model: string = CF_DEFAULT_MODEL) {}

  async reply(input: EngineInput): Promise<EngineReply> {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !token) return fallbackReply(input);

    const ctx = makeDynamicCtx(input.companion, {
      stage: input.stage,
      summary: input.summary,
      memories: input.memories,
      lastCallInfo: input.lastCallInfo,
      safetyInstruction: input.safetyEvent?.instruction ?? null,
      displayName: input.displayName,
    });
    // "json" output mode swaps the tool instruction for the JSON contract.
    const { persona, dynamic } = buildSystemPrompt(input.companion, ctx, "json");
    const system = `${persona}\n\n${dynamic}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    if (process.env.CLOUDFLARE_AI_GATEWAY_ID) {
      headers["cf-aig-gateway-id"] = process.env.CLOUDFLARE_AI_GATEWAY_ID;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);

    try {
      const res = await fetch(cloudflareRunUrl(this.model, accountId), {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          messages: toCfMessages(input, system),
          max_tokens: 600,
          temperature: 0.9,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(
          `[cloudflare-engine] HTTP ${res.status} ${this.model} ${body.slice(0, 300)}`,
        );
        return fallbackReply(input);
      }

      const data = (await res.json()) as CfRunResponse;
      if (data.success === false) {
        console.error(
          `[cloudflare-engine] api error ${JSON.stringify(data.errors ?? []).slice(0, 300)}`,
        );
        return fallbackReply(input);
      }

      const text = extractCfText(data);
      const { reply, via } = parseStructuredReply(text);
      if (!reply) {
        console.error("[cloudflare-engine] unparseable completion", text.slice(0, 200));
        return fallbackReply(input);
      }
      if (via !== "json") {
        console.warn(`[cloudflare-engine] recovered reply via "${via}" (${this.model})`);
      }

      const u = data.result?.usage;
      return {
        ...reply,
        usage: {
          inputTokens: u?.prompt_tokens ?? 0,
          outputTokens: u?.completion_tokens ?? 0,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          model: this.model,
        },
      };
    } catch (err) {
      console.error(
        "[cloudflare-engine] call failed",
        err instanceof Error ? err.message : String(err),
      );
      return fallbackReply(input);
    } finally {
      clearTimeout(timer);
    }
  }
}
