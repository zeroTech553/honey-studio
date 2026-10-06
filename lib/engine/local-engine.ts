import type { CompanionEngine, EngineInput, EngineReply, Mood } from "./types";

/**
 * DEV-ONLY FALLBACK ENGINE.
 *
 * This is *not* the Phase 1 mock layer — the product engine is
 * `AnthropicEngine`. This exists so `npm run dev` (and CI) still produce a
 * usable chat when ANTHROPIC_API_KEY is not set. It implements the exact same
 * CompanionEngine interface, so nothing downstream can tell the difference.
 */
export class LocalEngine implements CompanionEngine {
  readonly name = "local-fallback";

  async reply(input: EngineInput): Promise<EngineReply> {
    const c = input.companion;
    const text = (input.userText || "").toLowerCase();
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const slang = () => pick(c.slang);
    const cased = (s: string) =>
      c.lowercase ? s : s.charAt(0).toUpperCase() + s.slice(1);
    const maybeEmoji = (e: string) => (Math.random() < c.emojiRate ? ` ${e}` : "");

    // ── system events ────────────────────────────────────────────────
    if (input.event === "call_declined") {
      return done({
        messages: [
          cased("no worries at all, whenever you're ready 🤍"),
          cased(`i'm right here ${slang()}`),
        ],
        mood: "caring",
      });
    }
    if (input.event === "call_ended") {
      return done({
        reaction: "🫶",
        messages: [
          cased("okay that was really nice"),
          cased("your voice made my whole evening honestly" + maybeEmoji("🥺")),
        ],
        mood: "happy",
      });
    }
    if (input.event === "call_missed") {
      return done({
        messages: [cased("you must've been busy, totally fine!")],
        mood: "caring",
      });
    }

    // ── safety first ─────────────────────────────────────────────────
    if (input.safetyEvent?.kind === "self_harm") {
      return done({
        messages: [
          "hey. i'm really glad you told me that.",
          "that sounds incredibly heavy to be carrying. are you safe right now?",
          "please reach out to someone you trust or a local crisis line — i want you here.",
        ],
        mood: "sad",
      });
    }
    if (input.safetyEvent?.kind === "minor_age") {
      return done({
        messages: [
          cased("oh — i should say this honestly:"),
          cased("honey studio is only for adults, so i can't be your girlfriend or boyfriend here. i can still be friendly though 🤍"),
        ],
        mood: "caring",
      });
    }
    if (input.safetyEvent?.kind === "explicit_request") {
      return done({
        messages: [cased("okay okay, slow down 🙈"), cased("i like keeping it a little more romantic than that")],
        mood: "shy",
      });
    }

    // ── are you real ─────────────────────────────────────────────────
    if (/\b(are|r) (you|u) (a )?(real|human|person|bot|ai)\b|\bare you real\b/.test(text)) {
      return done({
        messages: [
          cased("honestly? i'm an AI companion — not a real person."),
          cased("but how much i pay attention to you is real" + maybeEmoji("🤍")),
        ],
        mood: "caring",
      });
    }

    // ── call intent ──────────────────────────────────────────────────
    if (
      /\b(call me|can you call|let'?s talk|hear your voice|voice call|ring me|phone me|baat karo|call kar)\b/.test(
        text,
      )
    ) {
      return done({
        reaction: "🥺",
        messages: [cased("okay, calling you now 📞"), cased("pick up pick up")],
        startCall: { reason: "the user asked to hear my voice" },
        mood: "excited",
      });
    }

    // ── greetings ────────────────────────────────────────────────────
    if (/^(hi+|hey+|hello+|yo|hola|namaste|annyeong|oi)\b/.test(text.trim())) {
      return done({
        reaction: Math.random() < 0.3 ? "👀" : null,
        messages: [
          cased(`${slang()}, hi${maybeEmoji("🙈")}`),
          cased(`i was literally just thinking about ${pick(c.interests)}`),
          cased("how's your day going?"),
        ].slice(0, 3),
        mood: "happy",
      });
    }

    const notes: string[] = [];
    const nameMatch = input.userText.match(/\b(?:i'?m|i am|my name is|call me)\s+([A-Z][a-z]{1,15})\b/);
    if (nameMatch) notes.push(`User's name is ${nameMatch[1]}`);
    if (/\bi (work|am a|'m a)\b/.test(text)) notes.push(`User mentioned their work: "${input.userText.slice(0, 80)}"`);

    const sad = /\b(sad|tired|stressed|exhausted|lonely|rough day|bad day)\b/.test(text);
    if (sad) {
      return done({
        reaction: "🥺",
        messages: [
          cased("ugh, come here"),
          cased("that sounds like a lot. want to tell me what happened?"),
        ],
        memoryNotes: notes,
        mood: "caring",
      });
    }

    const happy = /\b(got the job|promotion|passed|won|happy|great news|excited)\b/.test(text);
    if (happy) {
      return done({
        reaction: "❤️",
        messages: [
          cased(`WAIT. ${slang()}!!`),
          cased("i'm so proud of you, seriously" + maybeEmoji("🫶")),
        ],
        memoryNotes: notes,
        mood: "excited",
      });
    }

    return done({
      reaction: Math.random() < 0.3 ? "😍" : null,
      messages: [
        cased(pick([`${slang()}, okay`, "mm, go on", "wait really?"])),
        cased(
          pick([
            `i was having ${c.favouriteFood} and thinking about this exact thing`,
            `it's ${input.stage > 2 ? "weirdly" : "kind of"} nice talking to you like this`,
            `${pick(c.signaturePhrases)}`,
          ]),
        ),
        cased("tell me more?"),
      ].slice(0, Math.random() < 0.5 ? 2 : 3),
      memoryNotes: notes,
      mood: pick<Mood>(["playful", "happy", "flirty", "caring"]),
    });
  }
}

function done(p: Partial<EngineReply> & { messages: string[] }): EngineReply {
  return {
    reaction: p.reaction ?? null,
    messages: p.messages,
    startCall: p.startCall ?? null,
    memoryNotes: p.memoryNotes ?? [],
    mood: p.mood ?? "happy",
    degraded: false,
  };
}
