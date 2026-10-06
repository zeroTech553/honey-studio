import type { Companion } from "./types";

export type PresenceState = "online" | "typing-soon" | "away" | "asleep";

export interface Presence {
  state: PresenceState;
  label: string;
  localTime: string;
  dayPart: "late night" | "early morning" | "morning" | "afternoon" | "evening" | "night";
  localHour: number;
}

/** Local hour + minute for a companion's timezone, computed server-side. */
export function localParts(tz: string, now: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = fmt.format(now).split(":").map(Number);
  return { hour: h, minute: m };
}

export function localTimeString(tz: string, now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);
}

export function dayPartFor(hour: number): Presence["dayPart"] {
  if (hour < 5) return "late night";
  if (hour < 8) return "early morning";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

/**
 * Deterministic, server-computed presence so every client agrees.
 * Uses the companion's own rhythm + a stable pseudo-random "busy" window.
 */
export function presenceFor(
  companion: Pick<Companion, "id" | "timezone" | "wakeHour" | "sleepHour" | "name">,
  now: Date = new Date(),
): Presence {
  const { hour, minute } = localParts(companion.timezone, now);
  const localTime = localTimeString(companion.timezone, now);
  const dayPart = dayPartFor(hour);

  const asleep = isAsleep(hour, companion.wakeHour, companion.sleepHour);
  if (asleep) {
    return {
      state: "asleep",
      label: `sleeping · ${localTime} in ${splitCity(companion)}`,
      localTime,
      dayPart,
      localHour: hour,
    };
  }

  // Stable 20-minute bucket pseudo-randomness keyed on companion + bucket.
  const bucket = Math.floor(now.getTime() / (20 * 60 * 1000));
  const roll = hash32(`${companion.id}:${bucket}`) % 100;
  if (roll < 22) {
    return {
      state: "away",
      label: `away · back soon`,
      localTime,
      dayPart,
      localHour: hour,
    };
  }

  return {
    state: "online",
    label: "online",
    localTime,
    dayPart,
    localHour: hour,
  };
}

function splitCity(c: { name: string }) {
  return "their city";
}

export function isAsleep(hour: number, wake: number, sleep: number) {
  // sleep may wrap past midnight (e.g. sleep 2, wake 8 → asleep 2..8)
  if (sleep === wake) return false;
  if (sleep < wake) return hour >= sleep && hour < wake;
  return hour >= sleep || hour < wake;
}

function hash32(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
