"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CallBridge, CallProvider, type CallApi } from "@/lib/call/provider";
import { CallOverlay } from "@/components/call/call-overlay";
import { ChatHeader } from "./chat-header";
import { Composer } from "./composer";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { CrisisCard } from "./crisis-card";
import type { ChatMessage } from "./types";
import type { Companion } from "@/lib/companions/types";
import type { Presence } from "@/lib/companions/status";
import { buildTimeline } from "@/lib/engine/typing";
import { dayKey, friendlyDay, sleep, uid } from "@/lib/utils";

interface ChatApiResponse {
  reaction: string | null;
  messages: Array<{ id: string; content: string; createdAt: string }>;
  startCall: { reason: string } | null;
  mood: string;
  stage: number;
  userMessageId: string;
  safety: { crisis: boolean };
  degraded: boolean;
}

export function ChatScreen({
  companion,
  conversationId,
  initialMessages,
  initialPresence,
  initialStage,
}: {
  companion: Companion;
  conversationId: string;
  initialMessages: ChatMessage[];
  initialPresence: Presence;
  initialStage: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [typing, setTyping] = useState(false);
  const [stage, setStage] = useState(initialStage);
  const [presence, setPresence] = useState(initialPresence);
  const [busy, setBusy] = useState(false);

  const callRef = useRef<CallApi | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onCallReady = useCallback((api: CallApi) => {
    callRef.current = api;
  }, []);

  /* ── presence stays fresh, computed server-side ─────────────── */
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/presence?companionId=${companion.id}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { presence: Presence };
          setPresence(data.presence);
        }
      } catch {
        /* offline — keep the last known state */
      }
    }, 60_000);
    return () => clearInterval(t);
  }, [companion.id]);

  /* ── autoscroll ─────────────────────────────────────────────── */
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, typing, scrollToBottom]);

  /* ── helpers ────────────────────────────────────────────────── */
  const patchMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const appendSystemNotice = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: uid("notice"),
        role: "system",
        content,
        reaction: null,
        status: "sent",
        meta: { kind: "notice" },
        created_at: new Date().toISOString(),
      },
    ]);
  }, []);

  /**
   * Replays the structured reply as human-like typing. Nothing is streamed
   * from the server — the timing lives entirely here.
   */
  const playReply = useCallback(
    async (data: ChatApiResponse, userMessageId: string | null) => {
      const steps = buildTimeline(
        {
          reaction: data.reaction,
          messages: data.messages.map((m) => m.content),
          startCall: data.startCall,
        },
        companion,
      );

      let bubbleIndex = 0;
      for (const step of steps) {
        await sleep(step.delayMs);
        switch (step.kind) {
          case "seen":
            if (userMessageId) patchMessage(userMessageId, { status: "seen" });
            break;
          case "reaction":
            if (userMessageId && step.emoji)
              patchMessage(userMessageId, { reaction: step.emoji });
            break;
          case "typing":
            setTyping(true);
            break;
          case "bubble": {
            setTyping(false);
            const persisted = data.messages[bubbleIndex++];
            setMessages((prev) => [
              ...prev,
              {
                id: persisted?.id ?? uid("c"),
                role: "companion",
                content: step.text ?? persisted?.content ?? "",
                reaction: null,
                status: "sent",
                meta: { mood: data.mood },
                created_at: persisted?.createdAt ?? new Date().toISOString(),
              },
            ]);
            break;
          }
          case "call":
            callRef.current?.ring(data.startCall?.reason ?? "wanted to hear your voice");
            break;
        }
      }
      setTyping(false);

      if (data.safety.crisis) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid("crisis"),
            role: "system",
            content: "crisis_support",
            reaction: null,
            status: "sent",
            meta: { kind: "crisis_card" },
            created_at: new Date().toISOString(),
          },
        ]);
      }

      setStage(data.stage);
    },
    [companion, patchMessage],
  );

  /* ── sending ────────────────────────────────────────────────── */
  const post = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, ...body }),
      });
      return res;
    },
    [conversationId],
  );

  const send = useCallback(
    async (text: string, retryOf?: string) => {
      if (busy) return;
      setBusy(true);

      const tempId = retryOf ?? uid("tmp");
      if (retryOf) {
        patchMessage(retryOf, { status: "sending" });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            role: "user",
            content: text,
            reaction: null,
            status: "sending",
            created_at: new Date().toISOString(),
          },
        ]);
      }

      try {
        const res = await post({ userText: text, clientMessageId: tempId });

        if (res.status === 429) {
          const data = (await res.json()) as { message?: string };
          patchMessage(tempId, { status: "sent" });
          appendSystemNotice(data.message ?? "let's slow down a touch 🥺");
          return;
        }
        if (!res.ok) throw new Error(`chat failed (${res.status})`);

        const data = (await res.json()) as ChatApiResponse;
        const realId = data.userMessageId || tempId;
        patchMessage(tempId, { id: realId, status: "delivered" });
        await playReply(data, realId);
      } catch (err) {
        console.error("[chat] send failed", err);
        patchMessage(tempId, { status: "failed" });
        setTyping(false);
      } finally {
        setBusy(false);
      }
    },
    [appendSystemNotice, busy, patchMessage, playReply, post],
  );

  const retry = useCallback(
    (m: ChatMessage) => {
      void send(m.content, m.id);
    },
    [send],
  );

  /* ── engine events from the call layer ──────────────────────── */
  const sendEngineEvent = useCallback(
    (event: "call_declined" | "call_ended") => {
      void (async () => {
        try {
          const res = await post({ event, userText: "" });
          if (!res.ok) return;
          const data = (await res.json()) as ChatApiResponse;
          await playReply(data, null);
        } catch (err) {
          console.error("[chat] engine event failed", err);
        }
      })();
    },
    [playReply, post],
  );

  const addSystemMessage = useCallback(
    (m: { id: string; content: string; created_at: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: m.id,
          role: "system",
          content: m.content,
          reaction: null,
          status: "sent",
          meta: { kind: "call_log" },
          created_at: m.created_at,
        },
      ]);
    },
    [],
  );

  /* ── render ─────────────────────────────────────────────────── */
  let lastDay = "";

  return (
    <CallProvider
      conversationId={conversationId}
      companion={companion}
      onEngineEvent={sendEngineEvent}
      onSystemMessage={addSystemMessage}
    >
      <CallBridge onReady={onCallReady} />

      <div className="flex h-dvh flex-col">
        <ChatHeader
          companion={companion}
          presence={presence}
          stage={stage}
          typing={typing}
        />

        <div
          ref={scrollRef}
          className="honeycomb-field scroll-hide flex-1 overflow-y-auto px-3 py-5 sm:px-5"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5">
            <Intro companion={companion} />

            {messages.map((m) => {
              const dk = dayKey(m.created_at);
              const showDay = dk !== lastDay;
              lastDay = dk;

              return (
                <div key={m.id} className="contents">
                  {showDay ? <DayDivider label={friendlyDay(m.created_at)} /> : null}
                  {m.role === "system" ? (
                    <SystemRow message={m} />
                  ) : (
                    <MessageBubble
                      message={m}
                      accent={companion.accent}
                      showTime
                      onRetry={retry}
                    />
                  )}
                </div>
              );
            })}

            <AnimatePresence>
              {typing ? <TypingIndicator accent={companion.accent} /> : null}
            </AnimatePresence>

            <div ref={bottomRef} className="h-2" />
          </div>
        </div>

        <Composer
          onSend={(t) => void send(t)}
          disabled={busy}
          placeholder={`Message ${companion.name}…`}
        />
      </div>

      <CallOverlay companion={companion} />
    </CallProvider>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-3 flex items-center gap-3">
      <span className="h-px flex-1 bg-cream-300/80" />
      <span className="rounded-full border border-cream-300 bg-cream-50/80 px-3 py-0.5 text-[0.68rem] font-medium text-cocoa-400">
        {label}
      </span>
      <span className="h-px flex-1 bg-cream-300/80" />
    </div>
  );
}

function SystemRow({ message }: { message: ChatMessage }) {
  const kind = (message.meta?.kind as string) ?? "notice";
  if (kind === "crisis_card") return <div className="my-3"><CrisisCard /></div>;

  return (
    <div className="my-2 flex justify-center">
      <span className="rounded-full border border-cream-300 bg-cream-50/85 px-3.5 py-1.5 text-[0.75rem] font-medium text-cocoa-500 shadow-honey-sm">
        {kind === "call_log" ? "📞 " : ""}
        {message.content}
      </span>
    </div>
  );
}

function Intro({ companion }: { companion: Companion }) {
  return (
    <div className="mx-auto mb-4 max-w-md rounded-[1.5rem] border border-cream-300 bg-cream-50/70 px-5 py-4 text-center shadow-honey-sm">
      <p className="font-display text-[1.02rem] font-semibold text-cocoa-900">
        {companion.name}, {companion.age} · {companion.city} {companion.countryFlag}
      </p>
      <p className="mt-1.5 text-[0.83rem] leading-relaxed text-cocoa-500">
        {companion.tagline}
      </p>
      <p className="mt-2.5 text-[0.7rem] leading-relaxed text-cocoa-400">
        {companion.name} is an AI companion — not a real person. Nothing here is a
        substitute for real support.
      </p>
    </div>
  );
}
