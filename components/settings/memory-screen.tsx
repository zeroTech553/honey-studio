"use client";

import { useState } from "react";
import Link from "next/link";
import { HoneyDrop, HoneyWordmark } from "@/components/brand/honey-drop";
import { friendlyDay } from "@/lib/utils";

export interface MemoryGroup {
  conversationId: string;
  companionName: string;
  countryFlag: string;
  avatarFrom: string;
  avatarTo: string;
  summary: string | null;
  memories: Array<{ id: string; fact: string; createdAt: string }>;
}

export function MemoryScreen({ groups }: { groups: MemoryGroup[] }) {
  const [state, setState] = useState(groups);
  const [pending, setPending] = useState<string | null>(null);

  async function forget(groupId: string, memoryId: string) {
    setPending(memoryId);
    try {
      await fetch(`/api/memories?id=${encodeURIComponent(memoryId)}`, {
        method: "DELETE",
      });
      setState((prev) =>
        prev.map((g) =>
          g.conversationId === groupId
            ? { ...g, memories: g.memories.filter((m) => m.id !== memoryId) }
            : g,
        ),
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="honeycomb-field min-h-dvh pb-20">
      <header className="sticky top-0 z-30 border-b border-cream-300/70 bg-cream-100/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5">
          <HoneyWordmark size={28} className="text-[0.95rem]" />
          <Link
            href="/settings"
            className="rounded-xl px-3 py-2 text-sm font-medium text-cocoa-500 transition hover:bg-cream-200/70 hover:text-cocoa-700"
          >
            ← Settings
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-cocoa-900">
            What they remember
          </h1>
          <p className="mt-2 max-w-xl text-[0.95rem] leading-relaxed text-cocoa-500">
            Your companion keeps a short list of durable facts about you, plus a rolling
            summary of your conversation. Remove anything you&apos;d rather they forget —
            it&apos;s gone from their context immediately.
          </p>
        </div>

        {state.length === 0 ? (
          <div className="rounded-[1.75rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/70 p-10 text-center shadow-honey-sm">
            <HoneyDrop size={56} glow idSuffix="-mem" className="mx-auto animate-float" />
            <p className="mt-4 font-display text-lg font-semibold text-cocoa-900">
              Nothing remembered yet
            </p>
            <p className="mt-1.5 text-[0.9rem] text-cocoa-500">
              Start a conversation and your companion will pick things up naturally.
            </p>
          </div>
        ) : null}

        {state.map((g) => (
          <section
            key={g.conversationId}
            className="rounded-[1.75rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/70 p-6 shadow-honey-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className="grid size-11 place-items-center rounded-full font-display font-semibold text-cream-50"
                style={{
                  background: `linear-gradient(145deg, ${g.avatarFrom}, ${g.avatarTo})`,
                }}
              >
                {g.companionName.charAt(0)}
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-cocoa-900">
                  {g.companionName} {g.countryFlag}
                </h2>
                <p className="text-[0.76rem] text-cocoa-400">
                  {g.memories.length} / 50 facts remembered
                </p>
              </div>
            </div>

            {g.summary ? (
              <div className="mt-4 rounded-2xl border border-cream-300 bg-cream-200/40 p-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-cocoa-400">
                  Conversation summary
                </p>
                <p className="mt-2 text-[0.88rem] leading-relaxed text-cocoa-600">
                  {g.summary}
                </p>
              </div>
            ) : null}

            {g.memories.length === 0 ? (
              <p className="mt-4 text-[0.88rem] text-cocoa-400">
                No facts stored for this conversation yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {g.memories.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start gap-3 rounded-2xl border border-cream-300 bg-cream-50/80 px-4 py-3"
                  >
                    <span className="mt-1 text-[0.8rem]">🫙</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9rem] leading-relaxed text-cocoa-700">
                        {m.fact}
                      </p>
                      <p className="mt-0.5 text-[0.7rem] text-cocoa-400">
                        remembered {friendlyDay(m.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => forget(g.conversationId, m.id)}
                      disabled={pending === m.id}
                      className="shrink-0 rounded-xl border border-blush-400/50 bg-blush-300/20 px-3 py-1.5 text-[0.76rem] font-medium text-[#9b2140] transition hover:bg-blush-300/35 disabled:opacity-50"
                    >
                      {pending === m.id ? "…" : "Forget"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
