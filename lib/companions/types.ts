export type CompanionGender = "girlfriend" | "boyfriend";

export interface Companion {
  id: string;
  name: string;
  age: number;
  /** The role this companion plays for the user. */
  gender: CompanionGender;
  city: string;
  country: string;
  countryFlag: string;
  /** IANA timezone — drives the server-computed online status + localTime. */
  timezone: string;
  tagline: string;
  bio: string;
  tags: string[];
  interests: string[];
  favouriteFood: string;
  languages: string[];
  slang: string[];
  signaturePhrases: string[];
  /** 0..1 — how emoji-heavy this companion texts. */
  emojiRate: number;
  /** Does this companion text in lowercase? */
  lowercase: boolean;
  /** Average words-per-minute typing speed, used by the client typing sim. */
  typingWpm: number;
  /** Voice id for the (future) TTS pipeline. */
  voiceId: string;
  /** Visual identity — Phase 1 design system. */
  accent: string;
  avatarFrom: string;
  avatarTo: string;
  /** Rough daily rhythm in local time, used for online-status simulation. */
  wakeHour: number;
  sleepHour: number;
}
