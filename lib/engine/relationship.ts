export interface StageInput {
  messageCount: number;
  daysChatted: number;
  currentStage: number;
}

/**
 * Relationship stage grows slowly, needs BOTH volume and time, and never
 * regresses. 1 = just met → 4 = deeply bonded.
 */
export const STAGE_THRESHOLDS = [
  { stage: 2, messages: 24, days: 2 },
  { stage: 3, messages: 90, days: 5 },
  { stage: 4, messages: 240, days: 14 },
] as const;

export function computeStage({ messageCount, daysChatted, currentStage }: StageInput) {
  let stage = 1;
  for (const t of STAGE_THRESHOLDS) {
    if (messageCount >= t.messages && daysChatted >= t.days) stage = t.stage;
  }
  return Math.max(1, Math.min(4, Math.max(stage, currentStage || 1)));
}

/** Days the user has actually shown up, derived from first contact + today. */
export function bumpDaysChatted(
  lastMessageAt: string | null,
  daysChatted: number,
  now: Date = new Date(),
) {
  if (!lastMessageAt) return Math.max(1, daysChatted);
  const last = new Date(lastMessageAt);
  const sameDay =
    last.getUTCFullYear() === now.getUTCFullYear() &&
    last.getUTCMonth() === now.getUTCMonth() &&
    last.getUTCDate() === now.getUTCDate();
  return sameDay ? Math.max(1, daysChatted) : Math.max(1, daysChatted) + 1;
}
