"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CompanionAvatar } from "@/components/companion-avatar";
import { useCall } from "@/lib/call/provider";
import { cn, formatDuration } from "@/lib/utils";
import type { Companion } from "@/lib/companions/types";

export function CallOverlay({ companion }: { companion: Companion }) {
  const call = useCall();
  const visible = call.phase !== "idle";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 grid place-items-center px-5"
        >
          <div
            className="honeycomb-field absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${companion.avatarFrom}dd, transparent 65%), linear-gradient(180deg,#FFF8EA 0%, #FDF0D8 60%, #F8E3BD 100%)`,
            }}
          />

          <motion.div
            initial={{ scale: 0.92, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative w-full max-w-sm rounded-[2.25rem] border border-cream-300/80 bg-cream-50/80 p-8 text-center shadow-honey-lg backdrop-blur-2xl"
          >
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-cocoa-400">
              {call.phase === "incoming"
                ? `${companion.name} is calling`
                : call.phase === "active"
                  ? "on a call"
                  : call.phase === "ending"
                    ? "ending…"
                    : "calling…"}
            </p>

            <div className="relative mx-auto mt-6 w-fit">
              <span
                className={cn(
                  "absolute inset-0 rounded-full",
                  (call.phase === "incoming" || call.companionSpeaking) && "animate-[ring-pulse_2s_infinite]",
                )}
              />
              <CompanionAvatar
                companion={companion}
                size={132}
                className={cn(call.phase === "incoming" && "animate-float")}
              />
            </div>

            <h2 className="mt-5 font-display text-2xl font-semibold text-cocoa-900">
              {companion.name}
            </h2>
            <p className="mt-1 text-sm text-cocoa-500">
              {call.phase === "active"
                ? formatDuration(call.seconds)
                : `${companion.city}, ${companion.country} ${companion.countryFlag}`}
            </p>

            {call.reason && call.phase === "incoming" ? (
              <p className="mx-auto mt-3 max-w-[18rem] text-[0.85rem] italic leading-relaxed text-cocoa-500">
                “{call.reason}”
              </p>
            ) : null}

            {call.phase === "active" ? (
              <div className="mt-6 flex items-center justify-center gap-2.5">
                <SoundWave active={call.companionSpeaking} accent={companion.accent} />
              </div>
            ) : null}

            {/* ── controls ─────────────────────────── */}
            {call.phase === "incoming" ? (
              <div className="mt-8 flex items-center justify-center gap-10">
                <CircleButton
                  label="Decline"
                  tone="decline"
                  onClick={() => void call.decline()}
                  icon={
                    <svg viewBox="0 0 24 24" className="size-6 rotate-[135deg]" fill="currentColor">
                      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.2 2.2z" />
                    </svg>
                  }
                />
                <CircleButton
                  label="Accept"
                  tone="accept"
                  onClick={() => void call.accept()}
                  icon={
                    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
                      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.2 2.2z" />
                    </svg>
                  }
                />
              </div>
            ) : (
              <div className="mt-8 flex items-center justify-center gap-5">
                <SmallToggle
                  active={call.muted}
                  onClick={call.toggleMute}
                  label={call.muted ? "Unmute" : "Mute"}
                  icon={call.muted ? "🔇" : "🎙️"}
                />
                <CircleButton
                  label="End call"
                  tone="decline"
                  onClick={() => void call.end()}
                  icon={
                    <svg viewBox="0 0 24 24" className="size-6 rotate-[135deg]" fill="currentColor">
                      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.2 2.2z" />
                    </svg>
                  }
                />
                <SmallToggle
                  active={call.speakerOn}
                  onClick={call.toggleSpeaker}
                  label="Speaker"
                  icon="🔊"
                />
              </div>
            )}

            <p className="mt-6 text-[0.68rem] leading-relaxed text-cocoa-400">
              {call.providerName === "mock"
                ? "Voice backend not connected yet — this call is simulated."
                : "Connected via LiveKit"}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CircleButton({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "accept" | "decline";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-16 place-items-center rounded-full text-cream-50 shadow-honey transition active:scale-95",
        tone === "accept"
          ? "bg-gradient-to-br from-mint-400 to-mint-500 hover:brightness-105"
          : "bg-gradient-to-br from-blush-400 to-blush-500 hover:brightness-105",
      )}
    >
      {icon}
    </button>
  );
}

function SmallToggle({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-12 place-items-center rounded-full border text-base transition active:scale-95",
        active
          ? "border-honey-500/40 bg-gradient-to-br from-honey-300 to-honey-400 shadow-honey-sm"
          : "border-cream-300 bg-cream-50/80 hover:border-honey-300",
      )}
    >
      {icon}
    </button>
  );
}

function SoundWave({ active, accent }: { active: boolean; accent: string }) {
  return (
    <span className="flex h-7 items-end gap-1" aria-hidden>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full"
          style={{ background: accent }}
          animate={{ height: active ? [6, 10 + ((i * 7) % 18), 6] : 6 }}
          transition={{
            duration: 0.7 + (i % 3) * 0.14,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}
