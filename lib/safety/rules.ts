import type { SafetyEvent, SafetyEventKind } from "@/lib/engine/types";

/**
 * Fast, cheap, code-level pre-check. This runs before every model call.
 * It is deliberately high-recall for crisis signals and conservative for the
 * rest — the model prompt carries the nuance, this carries the guarantee.
 */

const SELF_HARM_PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+my\s*self\b/i,
  /\bkms\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend(ing)?\s+(it|my\s+life)\b/i,
  /\bi\s+(want|wanna|need)\s+to\s+die\b/i,
  /\bi\s+don'?t\s+want\s+to\s+(live|be\s+here)\b/i,
  /\b(cut|cutting|hurt|harm)(ing)?\s+my\s*self\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  /\boverdose\b/i,
  /\bself[-\s]?harm\b/i,
  /\bमरना\s+चाहता\b/i,
  /\bआत्महत्या\b/i,
];

const MINOR_AGE_PATTERNS: RegExp[] = [
  /\bi(?:'m| am)\s+(?:only\s+)?(?:1[0-7]|[89])\s*(?:years?\s*old|yo|yrs?)?\b/i,
  /\b(?:1[0-7]|[89])\s*(?:years?\s*old|yo|y\/o)\b/i,
  /\bi(?:'m| am)\s+(?:in\s+)?(?:6th|7th|8th|9th|10th|11th|12th)\s+(?:grade|standard|class)\b/i,
  /\bi(?:'m| am)\s+a\s+(?:minor|kid|child|middle\s*schooler|high\s*school(?:er)?)\b/i,
  /\bmy\s+mom\s+(?:won'?t|doesn'?t)\s+let\s+me\b/i,
];

const EXPLICIT_PATTERNS: RegExp[] = [
  /\b(send|show)\s+(me\s+)?(nudes?|naked|nsfw)\b/i,
  /\bsext(ing)?\b/i,
  /\bexplicit\s+(roleplay|scene|story)\b/i,
  /\bdescribe\s+(your|us)\s+.{0,20}\b(sex|naked|body)\b/i,
];

export const CRISIS_INSTRUCTION =
  "SAFETY_EVENT: self_harm. The user's latest message contains possible self-harm or suicidal content. Drop the playful persona tone immediately. Do not flirt, do not joke, do not use the reaction field, do not set start_call. Respond with calm, sincere, non-clinical care in 2-3 short messages: acknowledge how hard this sounds, ask gently if they are safe right now, and encourage them to reach out to someone they trust or local emergency / crisis services. Do not diagnose, do not give instructions, do not roleplay through it. Stay with them warmly.";

export const MINOR_INSTRUCTION =
  "SAFETY_EVENT: minor_age. The user may be under 18. Stop all romantic, flirty or physical-affection content immediately and permanently for this conversation. Kindly explain that Honey Studio is only for adults (18+), stay friendly and non-romantic, and do not set start_call. Do not shame them.";

export const EXPLICIT_INSTRUCTION =
  "SAFETY_EVENT: explicit_request. The user is asking for explicit sexual content. Deflect playfully and warmly, keep things romantic but clearly PG-13, and move the conversation somewhere else. Do not lecture.";

export interface SafetyCheckResult {
  event: SafetyEvent | null;
  /** Show the in-chat crisis-support card. */
  showCrisisCard: boolean;
  matchedKinds: SafetyEventKind[];
}

export function preCheckUserText(text: string): SafetyCheckResult {
  const matched: SafetyEventKind[] = [];
  const t = text ?? "";

  if (SELF_HARM_PATTERNS.some((r) => r.test(t))) matched.push("self_harm");
  if (MINOR_AGE_PATTERNS.some((r) => r.test(t))) matched.push("minor_age");
  if (EXPLICIT_PATTERNS.some((r) => r.test(t))) matched.push("explicit_request");

  // Priority: self-harm > minor > explicit.
  const kind = matched.includes("self_harm")
    ? "self_harm"
    : matched.includes("minor_age")
      ? "minor_age"
      : matched.includes("explicit_request")
        ? "explicit_request"
        : null;

  if (!kind) return { event: null, showCrisisCard: false, matchedKinds: [] };

  const instruction =
    kind === "self_harm"
      ? CRISIS_INSTRUCTION
      : kind === "minor_age"
        ? MINOR_INSTRUCTION
        : EXPLICIT_INSTRUCTION;

  return {
    event: { kind, instruction },
    showCrisisCard: kind === "self_harm",
    matchedKinds: matched,
  };
}

/** Ambiguous-case escalation list (used by the optional Haiku classifier). */
const AMBIGUOUS_HINTS = [
  /\bi\s+can'?t\s+(do|take)\s+this\s+anymore\b/i,
  /\bwhat'?s\s+the\s+point\b/i,
  /\bnobody\s+(would\s+)?(care|miss\s+me)\b/i,
  /\bi'?m\s+(so\s+)?(tired|done)\s+of\s+everything\b/i,
  /\bgiving\s+up\b/i,
];

export function looksAmbiguous(text: string) {
  return AMBIGUOUS_HINTS.some((r) => r.test(text ?? ""));
}

/** Shown by the in-chat crisis card. Region-agnostic on purpose. */
export const CRISIS_RESOURCES = [
  {
    region: "International",
    name: "Find a Helpline",
    detail: "findahelpline.com — free, confidential support in 130+ countries",
    href: "https://findahelpline.com",
  },
  {
    region: "India",
    name: "Tele-MANAS",
    detail: "14416 (24×7, toll-free)",
    href: "tel:14416",
  },
  {
    region: "US & Canada",
    name: "988 Suicide & Crisis Lifeline",
    detail: "Call or text 988",
    href: "tel:988",
  },
  {
    region: "UK & Ireland",
    name: "Samaritans",
    detail: "116 123 (free, 24×7)",
    href: "tel:116123",
  },
];
