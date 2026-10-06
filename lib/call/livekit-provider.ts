import type {
  CallConnectOptions,
  CallEvent,
  CallHandle,
  CallProvider,
} from "./types";

/**
 * ════════════════════════════════════════════════════════════════════
 * LiveKit voice provider — DOCUMENTED STUB.
 * ════════════════════════════════════════════════════════════════════
 *
 * Everything above this file is finished: the call UI, call_sessions rows,
 * decline/end engine events and the transcript line all work today through
 * MockCallProvider. What is missing is the actual audio pipeline.
 *
 * `POST /api/call/token` already mints a real LiveKit join token (HS256,
 * see lib/call/livekit-token.ts) whenever LIVEKIT_URL / LIVEKIT_API_KEY /
 * LIVEKIT_API_SECRET are present, and returns 501 otherwise. The response
 * carries { url, token, room, voiceId }.
 *
 * ── TODO: client side ───────────────────────────────────────────────
 *  1. `npm i livekit-client`.
 *  2. In connect(): POST /api/call/token → { url, token }.
 *     const room = new Room({ adaptiveStream: true, dynacast: true });
 *     await room.connect(url, token);
 *     await room.localParticipant.setMicrophoneEnabled(true);
 *  3. Wire events:
 *     room.on(RoomEvent.Connected,        () => emit("connected"))
 *     room.on(RoomEvent.Disconnected,     () => emit("disconnected"))
 *     room.on(RoomEvent.ActiveSpeakersChanged, (s) =>
 *        emit("speaking", s.some(p => p.identity === `companion:${companionId}`)))
 *     room.on(RoomEvent.TrackSubscribed, (track) => track.attach())
 *  4. setMuted → room.localParticipant.setMicrophoneEnabled(!muted).
 *  5. disconnect → room.disconnect().
 *
 * ── TODO: server/agent side (the part you said you'd build) ─────────
 *  A LiveKit Agent joins room `hs_<conversationId>` as
 *  `companion:<companionId>` and runs this loop:
 *
 *    1. STT      — stream the user's audio track to a speech-to-text
 *                  service (Deepgram / Whisper / AssemblyAI). Use VAD +
 *                  endpointing so you get clean utterances.
 *
 *    2. LLM      — call Claude with EXACTLY the same persona as chat, but
 *                  in spoken mode:
 *
 *                     import { buildSpokenSystemPrompt, makeDynamicCtx }
 *                       from "@/lib/engine/prompt";
 *                     const sys = buildSpokenSystemPrompt(companion,
 *                       makeDynamicCtx(companion, {
 *                         stage, summary, memories, lastCallInfo,
 *                         safetyInstruction, displayName,
 *                       }));
 *
 *                  Spoken mode already instructs: short sentences (~15
 *                  words), NO emoji, no markdown, one thought per turn.
 *                  Do NOT force the companion_reply tool here — plain text
 *                  streams to TTS with much lower latency.
 *
 *    3. TTS      — synthesise with the companion's voice:
 *                  companion.voiceId (e.g. "hs-aanya-in-f"). Map these ids
 *                  to your provider's voices (ElevenLabs / Cartesia /
 *                  PlayHT). Stream audio frames back into the room.
 *
 *    4. Barge-in — when the user starts speaking, cancel in-flight TTS.
 *
 *    5. Persist  — after the call, write the transcript into `messages`
 *                  (role 'companion' / 'user', meta: { source: 'call' })
 *                  and feed new facts through the same memory_notes path.
 *                  The "Call · mm:ss" system line is already written by
 *                  PATCH /api/call/session.
 *
 *    6. Safety   — run lib/safety/rules.ts preCheckUserText() on each STT
 *                  transcript too; on a self_harm hit, switch the agent to
 *                  the crisis script and log a safety_events row.
 *
 * Until all of that exists, isAvailable() returns false and the app
 * transparently uses MockCallProvider.
 */
export class LiveKitCallProvider implements CallProvider {
  readonly name = "livekit";

  async isAvailable(conversationId: string): Promise<boolean> {
    try {
      const res = await fetch("/api/call/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (res.status === 501) return false; // voice provider not configured
      return res.ok;
    } catch {
      return false;
    }
  }

  async connect(opts: CallConnectOptions): Promise<CallHandle> {
    const res = await fetch("/api/call/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId: opts.conversationId,
        sessionId: opts.sessionId,
      }),
    });

    if (!res.ok) {
      throw new Error(
        res.status === 501
          ? "voice provider not configured"
          : `call token failed (${res.status})`,
      );
    }

    const { url, token, room } = (await res.json()) as {
      url: string;
      token: string;
      room: string;
    };

    // TODO: replace this throw with the livekit-client Room connection above.
    void url;
    void token;

    const listeners = new Map<CallEvent, Set<(p?: unknown) => void>>();
    throw new LiveKitNotImplemented(room, listeners.size);
  }
}

export class LiveKitNotImplemented extends Error {
  constructor(room: string, _n: number) {
    super(
      `LiveKit audio pipeline not implemented yet (room ${room}). ` +
        `See lib/call/livekit-provider.ts for the TODO list.`,
    );
    this.name = "LiveKitNotImplemented";
  }
}
