import type { CompanionEngine } from "./types";
import { AnthropicEngine, DEFAULT_MODEL } from "./anthropic-engine";
import { LocalEngine } from "./local-engine";

export * from "./types";
export { buildSystemPrompt, buildSpokenSystemPrompt, makeDynamicCtx } from "./prompt";

let _engine: CompanionEngine | null = null;

/**
 * The single place the app resolves its engine.
 * Phase 2: Claude via the forced `companion_reply` tool call.
 */
export function getEngine(): CompanionEngine {
  if (_engine) return _engine;

  if (process.env.ANTHROPIC_API_KEY) {
    _engine = new AnthropicEngine(DEFAULT_MODEL);
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[engine] ANTHROPIC_API_KEY missing in production — falling back to LocalEngine.",
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
