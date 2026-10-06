import type { CompanionEngine } from "./types";
import { AnthropicEngine, DEFAULT_MODEL } from "./anthropic-engine";
import { CloudflareEngine, cloudflareConfigured } from "./cloudflare-engine";
import { LocalEngine } from "./local-engine";

export * from "./types";
export { buildSystemPrompt, buildSpokenSystemPrompt, makeDynamicCtx } from "./prompt";

let _engine: CompanionEngine | null = null;

export type EngineProvider = "anthropic" | "cloudflare" | "local" | "auto";

export function resolveProviderName(): EngineProvider {
  const explicit = (process.env.ENGINE_PROVIDER ?? "auto").toLowerCase();
  if (explicit === "cloudflare" || explicit === "anthropic" || explicit === "local") {
    return explicit;
  }
  // auto: whichever backend actually has credentials, Claude first.
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (cloudflareConfigured()) return "cloudflare";
  return "local";
}

/**
 * The single place the app resolves its engine.
 * Every provider implements the identical CompanionEngine interface, so
 * nothing downstream — route, timeline, UI — changes when you switch.
 */
export function getEngine(): CompanionEngine {
  if (_engine) return _engine;

  switch (resolveProviderName()) {
    case "cloudflare":
      _engine = new CloudflareEngine();
      break;
    case "anthropic":
      _engine = new AnthropicEngine(DEFAULT_MODEL);
      break;
    default:
      if (process.env.NODE_ENV === "production") {
        console.warn(
          "[engine] no model credentials found in production — falling back to LocalEngine.",
        );
      }
      _engine = new LocalEngine();
  }
  return _engine;
}

/** Test seam. */
export function __setEngine(e: CompanionEngine | null) {
  _engine = e;
}
