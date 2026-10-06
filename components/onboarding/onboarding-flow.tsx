"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { HoneyDrop, HoneyWordmark } from "@/components/brand/honey-drop";
import { CompanionAvatar } from "@/components/companion-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Presence } from "@/lib/companions/status";

export interface OnboardingCompanion {
  id: string;
  name: string;
  age: number;
  gender: "girlfriend" | "boyfriend";
  city: string;
  country: string;
  countryFlag: string;
  tagline: string;
  bio: string;
  tags: string[];
  languages: string[];
  avatarFrom: string;
  avatarTo: string;
  presence: Presence;
}

type Step = "age" | "gender" | "pick";
const ORDER: Step[] = ["age", "gender", "pick"];

export function OnboardingFlow({
  initialStep,
  companions,
  profile,
  email,
}: {
  initialStep: Step;
  companions: OnboardingCompanion[];
  profile: {
    displayName: string;
    preferredGender: "girlfriend" | "boyfriend" | null;
    ageConfirmed: boolean;
  };
  email: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep);
  const [name, setName] = useState(profile.displayName);
  const [gender, setGender] = useState(profile.preferredGender);
  const [ageOk, setAgeOk] = useState(profile.ageConfirmed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const list = useMemo(
    () => companions.filter((c) => !gender || c.gender === gender),
    [companions, gender],
  );

  async function patchProfile(patch: Record<string, unknown>) {
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Could not save that. Try again?");
  }

  async function confirmAge() {
    if (!ageOk) {
      setError("Honey Studio is 18+. Please confirm to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await patchProfile({ ageConfirmed: true });
      setStep("gender");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function saveGender(g: "girlfriend" | "boyfriend") {
    setGender(g);
    setBusy(true);
    setError(null);
    try {
      await patchProfile({
        preferredGender: g,
        ...(name.trim() ? { displayName: name.trim().slice(0, 40) } : {}),
      });
      setStep("pick");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function openChat(companionId: string) {
    setOpening(companionId);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companionId }),
      });
      if (!res.ok) throw new Error("Couldn't open that chat.");
      router.push(`/chat/${companionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setOpening(null);
    }
  }

  const stepIndex = ORDER.indexOf(step);

  return (
    <div className="honeycomb-field min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-cream-300/60 bg-cream-100/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <HoneyWordmark size={28} className="text-[0.95rem]" />
          <div className="flex items-center gap-2.5">
            {ORDER.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i <= stepIndex ? "w-7 bg-gradient-to-r from-honey-300 to-honey-500" : "w-3 bg-cream-300",
                )}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <AnimatePresence mode="wait">
          {/* ── 18+ gate ─────────────────────────────── */}
          {step === "age" ? (
            <motion.section
              key="age"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35 }}
              className="mx-auto max-w-lg"
            >
              <div className="rounded-[2rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/70 p-8 shadow-honey sm:p-10">
                <HoneyDrop size={60} glow idSuffix="-age" className="animate-float" />
                <h1 className="mt-5 font-display text-[1.8rem] font-semibold leading-tight text-cocoa-900">
                  Before we start
                </h1>
                <p className="mt-3 text-[0.98rem] leading-relaxed text-cocoa-500">
                  Honey Studio is an adults-only space. Your companion is an AI — warm and
                  attentive, but never a real person, and never pretending to be one.
                </p>

                <label className="mt-6 flex cursor-pointer select-none items-start gap-3 rounded-2xl border border-cream-300 bg-cream-50/70 p-4">
                  <input
                    type="checkbox"
                    checked={ageOk}
                    onChange={(e) => {
                      setAgeOk(e.target.checked);
                      setError(null);
                    }}
                    className="mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-md border border-cream-400 bg-cream-50 transition checked:border-honey-500 checked:bg-gradient-to-br checked:from-honey-300 checked:to-honey-500"
                  />
                  <span className="text-[0.88rem] leading-relaxed text-cocoa-600">
                    I confirm I&apos;m <strong className="text-cocoa-900">18 or older</strong>, and
                    I understand my companion is an AI companion, not a real person.
                  </span>
                </label>

                {error ? <ErrorNote>{error}</ErrorNote> : null}

                <Button
                  size="lg"
                  className="mt-6 w-full"
                  loading={busy}
                  onClick={confirmAge}
                >
                  Continue
                </Button>
                <p className="mt-4 text-center text-[0.72rem] text-cocoa-400">
                  {email ? `Signed in as ${email} · ` : ""}
                  <Link href="/legal/terms" className="underline underline-offset-2">
                    Terms
                  </Link>{" "}
                  ·{" "}
                  <Link href="/legal/privacy" className="underline underline-offset-2">
                    Privacy
                  </Link>
                </p>
              </div>
            </motion.section>
          ) : null}

          {/* ── gender ───────────────────────────────── */}
          {step === "gender" ? (
            <motion.section
              key="gender"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35 }}
              className="mx-auto max-w-2xl"
            >
              <h1 className="font-display text-[1.9rem] font-semibold leading-tight text-cocoa-900 sm:text-4xl">
                Who are you looking for?
              </h1>
              <p className="mt-3 text-[1rem] text-cocoa-500">
                You can change this any time in settings.
              </p>

              <label className="mt-7 block">
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-cocoa-400">
                  What should they call you?
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={40}
                  className="mt-2 h-12 w-full rounded-2xl border border-cream-300 bg-cream-50/90 px-4 text-[0.98rem] text-cocoa-700 placeholder:text-cocoa-400/70 focus:border-honey-400 focus:outline-none"
                />
              </label>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    { g: "girlfriend", label: "A girlfriend", emoji: "💛", sub: "5 companions" },
                    { g: "boyfriend", label: "A boyfriend", emoji: "🤎", sub: "5 companions" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.g}
                    onClick={() => saveGender(o.g)}
                    disabled={busy}
                    className={cn(
                      "group rounded-[1.75rem] border p-7 text-left transition-all duration-200 hover:-translate-y-1",
                      gender === o.g
                        ? "border-honey-500 bg-gradient-to-b from-honey-200/70 to-cream-100 shadow-honey"
                        : "border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/60 shadow-honey-sm hover:border-honey-300 hover:shadow-honey",
                    )}
                  >
                    <span className="text-3xl">{o.emoji}</span>
                    <p className="mt-3 font-display text-xl font-semibold text-cocoa-900">
                      {o.label}
                    </p>
                    <p className="mt-1 text-sm text-cocoa-500">{o.sub}</p>
                  </button>
                ))}
              </div>
              {error ? <ErrorNote>{error}</ErrorNote> : null}
            </motion.section>
          ) : null}

          {/* ── pick ─────────────────────────────────── */}
          {step === "pick" ? (
            <motion.section
              key="pick"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-[1.9rem] font-semibold leading-tight text-cocoa-900 sm:text-4xl">
                    Pick who you&apos;d like to meet
                  </h1>
                  <p className="mt-2.5 text-[1rem] text-cocoa-500">
                    Say hi to one — you can always meet the others later.
                  </p>
                </div>
                <button
                  onClick={() => setStep("gender")}
                  className="rounded-xl border border-cream-300 bg-cream-50/80 px-3.5 py-2 text-sm font-medium text-cocoa-500 transition hover:border-honey-300 hover:text-cocoa-700"
                >
                  ← change preference
                </button>
              </div>

              {error ? <ErrorNote>{error}</ErrorNote> : null}

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c, i) => (
                  <motion.button
                    key={c.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    onClick={() => openChat(c.id)}
                    disabled={Boolean(opening)}
                    className={cn(
                      "group relative flex h-full flex-col rounded-[1.75rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/60 p-5 text-left shadow-honey-sm transition-all duration-200",
                      "hover:-translate-y-1.5 hover:border-honey-300 hover:shadow-honey",
                      opening === c.id && "ring-2 ring-honey-400",
                      opening && opening !== c.id && "opacity-50",
                    )}
                  >
                    <div className="flex items-start gap-3.5">
                      <CompanionAvatar companion={c} size={58} presence={c.presence.state} />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-[1.15rem] font-semibold leading-tight text-cocoa-900">
                          {c.name}, {c.age}
                        </p>
                        <p className="text-[0.8rem] text-cocoa-400">
                          {c.city}, {c.country}
                        </p>
                        <p className="mt-1 text-[0.72rem] font-medium text-cocoa-400">
                          {c.presence.state === "asleep"
                            ? `😴 sleeping · ${c.presence.localTime}`
                            : c.presence.state === "away"
                              ? "away · back soon"
                              : `● online · ${c.presence.localTime}`}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3.5 text-[0.88rem] italic leading-snug text-cocoa-600">
                      “{c.tagline}”
                    </p>
                    <p className="mt-2 line-clamp-3 text-[0.82rem] leading-relaxed text-cocoa-500">
                      {c.bio}
                    </p>

                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {c.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-cream-300 bg-cream-200/60 px-2.5 py-0.5 text-[0.68rem] font-medium text-cocoa-500"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <span className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-honey-500/30 bg-gradient-to-br from-honey-300 to-honey-500 text-[0.88rem] font-medium text-cocoa-900 shadow-honey-sm transition group-hover:brightness-105">
                      {opening === c.id ? "opening…" : `Say hi to ${c.name}`}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-blush-400/50 bg-blush-300/25 px-3.5 py-2.5 text-[0.85rem] text-[#9b2140]">
      {children}
    </p>
  );
}
