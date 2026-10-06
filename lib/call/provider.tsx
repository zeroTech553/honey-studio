"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Companion } from "@/lib/companions/types";
import type { CallHandle, CallPhase, CallProvider as ICallProvider } from "./types";
import { MockCallProvider } from "./mock-provider";
import { LiveKitCallProvider } from "./livekit-provider";

export interface CallState {
  phase: CallPhase;
  reason: string | null;
  seconds: number;
  muted: boolean;
  speakerOn: boolean;
  companionSpeaking: boolean;
  providerName: string;
}

export interface CallApi extends CallState {
  /** The model asked for a call — show the incoming overlay. */
  ring(reason: string): void;
  /** The user tapped the call button. */
  startOutgoing(): Promise<void>;
  accept(): Promise<void>;
  decline(): Promise<void>;
  end(): Promise<void>;
  toggleMute(): void;
  toggleSpeaker(): void;
}

const Ctx = createContext<CallApi | null>(null);

export function useCall() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCall must be used inside <CallProvider>");
  return v;
}

/** Picks LiveKit when the backend is live, otherwise the mock provider. */
async function resolveProvider(conversationId: string): Promise<ICallProvider> {
  const livekit = new LiveKitCallProvider();
  try {
    if (await livekit.isAvailable(conversationId)) return livekit;
  } catch {
    /* fall through */
  }
  return new MockCallProvider();
}

export function CallProvider({
  conversationId,
  companion,
  onEngineEvent,
  onSystemMessage,
  children,
}: {
  conversationId: string;
  companion: Companion;
  /** Sends "call_declined" / "call_ended" back through /api/chat. */
  onEngineEvent: (event: "call_declined" | "call_ended") => void;
  /** Called with the persisted "Call · mm:ss" row so the thread updates. */
  onSystemMessage: (message: { id: string; content: string; created_at: string }) => void;
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [reason, setReason] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [companionSpeaking, setCompanionSpeaking] = useState(false);
  const [providerName, setProviderName] = useState("mock");

  const handleRef = useRef<CallHandle | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  const createSession = useCallback(
    async (initiatedBy: "user" | "companion", status: "active" | "declined") => {
      const res = await fetch("/api/call/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, initiatedBy, status }),
      });
      if (!res.ok) return null;
      const { session } = (await res.json()) as { session: { id: string } };
      return session.id;
    },
    [conversationId],
  );

  const connect = useCallback(
    async (initiatedBy: "user" | "companion") => {
      setPhase("connecting");
      const sessionId = await createSession(initiatedBy, "active");
      sessionIdRef.current = sessionId;

      const provider = await resolveProvider(conversationId);
      setProviderName(provider.name);

      try {
        const handle = await provider.connect({
          conversationId,
          companion,
          sessionId: sessionId ?? "local",
          initiatedBy,
        });
        handleRef.current = handle;
        handle.on("connected", () => {
          setPhase("active");
          setSeconds(0);
          stopTimer();
          tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        });
        handle.on("speaking", (v) => setCompanionSpeaking(Boolean(v)));
        handle.on("disconnected", () => setPhase("idle"));
      } catch (err) {
        console.error("[call] connect failed", err);
        // Graceful fallback to the mock provider so the UI never dead-ends.
        const mock = new MockCallProvider();
        setProviderName(mock.name);
        const handle = await mock.connect({
          conversationId,
          companion,
          sessionId: sessionId ?? "local",
          initiatedBy,
        });
        handleRef.current = handle;
        handle.on("connected", () => {
          setPhase("active");
          setSeconds(0);
          stopTimer();
          tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        });
        handle.on("speaking", (v) => setCompanionSpeaking(Boolean(v)));
        handle.on("disconnected", () => setPhase("idle"));
      }
    },
    [companion, conversationId, createSession, stopTimer],
  );

  const ring = useCallback((why: string) => {
    setReason(why);
    setPhase("incoming");
  }, []);

  const startOutgoing = useCallback(async () => {
    setReason(null);
    setPhase("outgoing");
    await connect("user");
  }, [connect]);

  const accept = useCallback(async () => {
    await connect("companion");
  }, [connect]);

  const finishSession = useCallback(
    async (status: "declined" | "completed" | "missed", duration: number) => {
      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      if (!sessionId) return null;
      const res = await fetch("/api/call/session", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          conversationId,
          durationSeconds: duration,
          status,
        }),
      });
      if (!res.ok) return null;
      return (await res.json()) as {
        systemMessage: { id: string; content: string; created_at: string } | null;
      };
    },
    [conversationId],
  );

  const decline = useCallback(async () => {
    setPhase("ending");
    const sessionId = await createSession("companion", "declined");
    sessionIdRef.current = sessionId;
    await finishSession("declined", 0);
    stopTimer();
    setPhase("idle");
    setSeconds(0);
    onEngineEvent("call_declined");
  }, [createSession, finishSession, onEngineEvent, stopTimer]);

  const end = useCallback(async () => {
    setPhase("ending");
    const duration = seconds;
    try {
      await handleRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    handleRef.current = null;
    stopTimer();

    const result = await finishSession("completed", duration);
    if (result?.systemMessage) onSystemMessage(result.systemMessage);

    setPhase("idle");
    setSeconds(0);
    setCompanionSpeaking(false);
    onEngineEvent("call_ended");
  }, [finishSession, onEngineEvent, onSystemMessage, seconds, stopTimer]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      handleRef.current?.setMuted(!m);
      return !m;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((s) => {
      handleRef.current?.setSpeaker(!s);
      return !s;
    });
  }, []);

  const value = useMemo<CallApi>(
    () => ({
      phase,
      reason,
      seconds,
      muted,
      speakerOn,
      companionSpeaking,
      providerName,
      ring,
      startOutgoing,
      accept,
      decline,
      end,
      toggleMute,
      toggleSpeaker,
    }),
    [
      accept,
      companionSpeaking,
      decline,
      end,
      muted,
      phase,
      providerName,
      reason,
      ring,
      seconds,
      speakerOn,
      startOutgoing,
      toggleMute,
      toggleSpeaker,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Lets a parent that owns chat state drive the call API (e.g. ring the
 * incoming overlay when the model returns start_call).
 */
export function CallBridge({ onReady }: { onReady: (api: CallApi) => void }) {
  const api = useCall();
  useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}
