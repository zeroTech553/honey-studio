"use client";

import Link from "next/link";
import { CompanionAvatar } from "@/components/companion-avatar";
import { useCall } from "@/lib/call/provider";
import type { Companion } from "@/lib/companions/types";
import type { Presence } from "@/lib/companions/status";
import { cn } from "@/lib/utils";

const STAGE_LABEL: Record<number, string> = {
  1: "just met",
  2: "getting comfortable",
  3: "close",
  4: "deeply bonded",
};

export function ChatHeader({
  companion,
  presence,
  stage,
  typing,
}: {
  companion: Companion;
  presence: Presence;
  stage: number;
  typing: boolean;
}) {
  const call = useCall();

  return (
    <header className="sticky top-0 z-30 border-b border-cream-300/70 bg-cream-100/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] w-full max-w-3xl items-center gap-3 px-3 sm:px-5">
        <Link
          href="/start?step=pick"
          aria-label="Back"
          className="grid size-9 shrink-0 place-items-center rounded-full text-cocoa-500 transition hover:bg-cream-200/70 hover:text-cocoa-700"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>

        <CompanionAvatar companion={companion} size={44} presence={presence.state} />

        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-display text-[1.05rem] font-semibold text-cocoa-900">
            {companion.name} {companion.countryFlag}
          </p>
          <p
            className={cn(
              "flex items-center gap-1.5 truncate text-[0.74rem]",
              typing
                ? "text-honey-600"
                : presence.state === "online"
                  ? "text-mint-500"
                  : "text-cocoa-400",
            )}
          >
            {typing ? (
              "typing…"
            ) : (
              <>
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    presence.state === "online"
                      ? "bg-mint-400"
                      : presence.state === "away"
                        ? "bg-honey-400"
                        : "bg-cocoa-400",
                  )}
                />
                {presence.state === "asleep"
                  ? `asleep · ${presence.localTime} in ${companion.city}`
                  : presence.state === "away"
                    ? `away · ${presence.localTime} in ${companion.city}`
                    : `online · ${presence.localTime} in ${companion.city}`}
              </>
            )}
          </p>
        </div>

        <span className="hidden rounded-full border border-cream-300 bg-cream-200/60 px-2.5 py-1 text-[0.66rem] font-medium uppercase tracking-wider text-cocoa-400 sm:inline">
          {STAGE_LABEL[stage] ?? "just met"}
        </span>

        <button
          onClick={() => void call.startOutgoing()}
          disabled={call.phase !== "idle"}
          aria-label={`Call ${companion.name}`}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-honey-500/30 bg-gradient-to-br from-honey-300 via-honey-400 to-honey-500 text-cocoa-900 shadow-honey-sm transition hover:brightness-105 active:scale-95 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="size-[1.15rem]" fill="currentColor">
            <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.2 2.2z" />
          </svg>
        </button>

        <Link
          href="/settings"
          aria-label="Settings"
          className="grid size-9 shrink-0 place-items-center rounded-full text-cocoa-500 transition hover:bg-cream-200/70 hover:text-cocoa-700"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
