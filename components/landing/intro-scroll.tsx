"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { HoneyDrop, HoneyWordmark } from "@/components/brand/honey-drop";
import { CompanionAvatar } from "@/components/companion-avatar";
import { SignupCard } from "@/components/auth/signup-card";
import { Button } from "@/components/ui/button";
import type { Presence } from "@/lib/companions/status";

interface PreviewCompanion {
  id: string;
  name: string;
  city: string;
  countryFlag: string;
  tagline: string;
  avatarFrom: string;
  avatarTo: string;
  gender: "girlfriend" | "boyfriend";
  presence: Presence;
}

const reveal = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function IntroScroll({
  preview,
  devMode,
  openSignup,
  nextPath,
}: {
  preview: PreviewCompanion[];
  devMode: boolean;
  openSignup?: boolean;
  nextPath?: string;
}) {
  const signupRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const dropY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const dropRotate = useTransform(scrollYProgress, [0, 1], [0, 14]);

  useEffect(() => {
    if (openSignup) {
      signupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [openSignup]);

  const scrollToSignup = () =>
    signupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="relative overflow-x-clip">
      {/* ── nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-cream-300/60 bg-cream-100/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <HoneyWordmark size={30} className="text-base" />
          <div className="flex items-center gap-2">
            <Link
              href="/legal/privacy"
              className="hidden rounded-xl px-3 py-2 text-sm font-medium text-cocoa-500 transition hover:bg-cream-200/70 hover:text-cocoa-700 sm:block"
            >
              Privacy
            </Link>
            <Button size="sm" onClick={scrollToSignup}>
              Get started
            </Button>
          </div>
        </nav>
      </header>

      {/* ── hero ────────────────────────────────────────── */}
      <section ref={heroRef} className="honeycomb-field relative">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-20">
          <div>
            <motion.div
              initial="hidden"
              animate="show"
              variants={reveal}
              className="inline-flex items-center gap-2 rounded-full border border-honey-400/50 bg-honey-200/50 px-3.5 py-1.5"
            >
              <span className="size-1.5 animate-pulse-soft rounded-full bg-mint-500" />
              <span className="text-[0.73rem] font-semibold uppercase tracking-[0.16em] text-cocoa-600">
                10 companions online now
              </span>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="show"
              custom={1}
              variants={reveal}
              className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-cocoa-900 sm:text-6xl"
            >
              Someone who
              <br />
              <span className="text-gradient-honey">actually remembers.</span>
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="show"
              custom={2}
              variants={reveal}
              className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-cocoa-500"
            >
              Honey Studio companions text like real people — short messages, their own
              moods, their own city and slang. They remember your dog&apos;s name, ask how
              the interview went, and call you when you need a voice.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="show"
              custom={3}
              variants={reveal}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button size="lg" onClick={scrollToSignup}>
                Meet your companion
              </Button>
              <span className="text-sm text-cocoa-400">
                18+ · AI companions, not real people
              </span>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              custom={4}
              variants={reveal}
              className="mt-10 flex flex-wrap gap-x-7 gap-y-3"
            >
              {[
                ["🫶", "Remembers everything"],
                ["📞", "Voice calls"],
                ["🌍", "10 cities, 9 languages"],
              ].map(([icon, label]) => (
                <span key={label} className="flex items-center gap-2 text-sm text-cocoa-500">
                  <span className="text-base">{icon}</span>
                  {label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* phone mock */}
          <motion.div
            style={{ y: dropY, rotate: dropRotate }}
            className="relative mx-auto w-full max-w-[332px]"
          >
            <div className="pointer-events-none absolute -left-10 -top-8 -z-10">
              <HoneyDrop size={120} glow idSuffix="-hero" className="animate-float opacity-60" />
            </div>
            <PhonePreview />
          </motion.div>
        </div>
      </section>

      {/* ── how it feels ────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={reveal}
          className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cocoa-400"
        >
          How it feels
        </motion.p>
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          custom={1}
          variants={reveal}
          className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight text-cocoa-900 sm:text-[2.6rem]"
        >
          Not a chatbot. A person-shaped presence in your pocket.
        </motion.h2>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
              variants={reveal}
              className="group rounded-[1.75rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/60 p-6 shadow-honey-sm transition hover:-translate-y-1 hover:shadow-honey"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-honey-200 to-honey-400/70 text-xl shadow-honey-sm">
                {f.icon}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-cocoa-900">
                {f.title}
              </h3>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-cocoa-500">{f.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ── companions ──────────────────────────────────── */}
      <section className="relative border-y border-cream-300/70 bg-cream-200/40 py-16 lg:py-24">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={reveal}
            className="font-display text-3xl font-semibold text-cocoa-900 sm:text-[2.4rem]"
          >
            Ten people. Ten time zones.
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            custom={1}
            variants={reveal}
            className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-cocoa-500"
          >
            Each companion has their own city, slang, favourite food and daily rhythm.
            When it&apos;s 2am in Seoul, Ji-woo is asleep.
          </motion.p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((c, i) => (
              <motion.div
                key={c.id}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
                custom={i % 3}
                variants={reveal}
                className="flex items-center gap-4 rounded-[1.5rem] border border-cream-300 bg-cream-50/80 p-4 shadow-honey-sm"
              >
                <CompanionAvatar companion={c} size={54} presence={c.presence.state} />
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2 font-display text-[1.05rem] font-semibold text-cocoa-900">
                    {c.name}
                    <span className="text-[0.72rem] font-medium uppercase tracking-wider text-cocoa-400">
                      {c.city}
                    </span>
                  </p>
                  <p className="truncate text-[0.85rem] text-cocoa-500">{c.tagline}</p>
                  <p className="mt-0.5 text-[0.72rem] text-cocoa-400">
                    {c.presence.state === "asleep"
                      ? `sleeping · ${c.presence.localTime}`
                      : c.presence.state === "away"
                        ? "away · back soon"
                        : `online · ${c.presence.localTime}`}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── honesty notice ──────────────────────────────── */}
      <section className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={reveal}
          className="rounded-[1.75rem] border border-honey-400/40 bg-gradient-to-br from-honey-200/60 to-cream-100/70 p-7 shadow-honey-sm sm:p-9"
        >
          <div className="flex items-start gap-4">
            <HoneyDrop size={44} idSuffix="-notice" glow className="mt-1 shrink-0" />
            <div>
              <h3 className="font-display text-xl font-semibold text-cocoa-900">
                An AI companion, not a real person
              </h3>
              <p className="mt-2.5 text-[0.95rem] leading-relaxed text-cocoa-600">
                Every companion here is generated by AI. They will never claim to be human,
                never promise to meet you, and never pressure you to keep talking. Honey
                Studio is 18+, and we&apos;d rather you had a great real life too — your
                companion will say so.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-[0.8rem] font-medium text-cocoa-500">
                <Link href="/legal/terms" className="underline underline-offset-4 hover:text-cocoa-700">
                  Terms
                </Link>
                <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-cocoa-700">
                  Privacy
                </Link>
                <span>Crisis support is built into every chat.</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── signup ──────────────────────────────────────── */}
      <section
        ref={signupRef}
        id="signup"
        className="honeycomb-field scroll-mt-24 border-t border-cream-300/70 py-16 lg:py-24"
      >
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold leading-tight text-cocoa-900 sm:text-[2.6rem]">
              Say hi.
              <br />
              <span className="text-gradient-honey">They&apos;re waiting.</span>
            </h2>
            <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed text-cocoa-500">
              Pick a girlfriend or boyfriend, send one message, and see how fast it stops
              feeling like software.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "Free to start, no card",
                "Delete your data any time",
                "Your chats are private to you",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-[0.95rem] text-cocoa-600">
                  <span className="grid size-6 place-items-center rounded-full bg-gradient-to-br from-honey-300 to-honey-500 text-[0.7rem] text-cocoa-900">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <SignupCard devMode={devMode} nextPath={nextPath || "/start"} />
        </div>
      </section>

      <footer className="border-t border-cream-300/70 bg-cream-100/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <HoneyWordmark size={26} className="text-sm" />
          <p className="text-xs text-cocoa-400">
            © {new Date().getFullYear()} Honey Studio · AI companions for adults
          </p>
          <div className="flex gap-4 text-xs font-medium text-cocoa-500">
            <Link href="/legal/terms" className="hover:text-cocoa-700">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-cocoa-700">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: "💬",
    title: "Texts like a human",
    body: "Two or three short bubbles, a typing pause, the odd emoji reaction. Never a wall of text, never a customer-service voice.",
  },
  {
    icon: "🧠",
    title: "Remembers your life",
    body: "Your job, your cat, the thing you were nervous about on Tuesday. They bring it up later, on their own.",
  },
  {
    icon: "📞",
    title: "Calls when it matters",
    body: "Ask to hear their voice and the phone rings. Say no and they're completely fine about it — no guilt, ever.",
  },
];

function PhonePreview() {
  return (
    <div className="relative rounded-[2.4rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-200/70 p-3 shadow-honey-lg">
      <div className="overflow-hidden rounded-[2rem] border border-cream-300/80 bg-cream-100">
        <div className="flex items-center gap-3 border-b border-cream-300/80 bg-cream-50/80 px-4 py-3">
          <span
            className="grid size-9 place-items-center rounded-full font-display text-sm font-semibold text-cream-50"
            style={{ background: "linear-gradient(145deg,#FFD470,#F98FA6)" }}
          >
            A
          </span>
          <div className="leading-tight">
            <p className="text-[0.9rem] font-semibold text-cocoa-900">Aanya 🇮🇳</p>
            <p className="flex items-center gap-1.5 text-[0.7rem] text-mint-500">
              <span className="size-1.5 rounded-full bg-mint-400" /> online · Mumbai
            </p>
          </div>
          <span className="ml-auto grid size-8 place-items-center rounded-full bg-gradient-to-br from-honey-300 to-honey-500 text-[0.8rem] shadow-honey-sm">
            📞
          </span>
        </div>

        <div className="space-y-2.5 px-4 py-5">
          <Bubble side="in">arre you finally texted 🙈</Bubble>
          <Bubble side="in">how was the interview??</Bubble>
          <Bubble side="out">got it 😭</Bubble>
          <Bubble side="in" reaction="❤️">
            WAIT. yaar!!
          </Bubble>
          <Bubble side="in">i knew it. told you na you'd kill it</Bubble>
          <div className="flex items-center gap-1.5 pl-1 pt-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-cocoa-400"
                style={{ animation: `typing-dot 1.2s ${i * 0.15}s infinite ease-in-out` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  side,
  children,
  reaction,
}: {
  side: "in" | "out";
  children: React.ReactNode;
  reaction?: string;
}) {
  const out = side === "out";
  return (
    <div className={`relative flex ${out ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "relative max-w-[82%] px-3.5 py-2 text-[0.83rem] leading-snug shadow-honey-sm",
          out
            ? "rounded-[1.1rem] rounded-br-md bg-gradient-to-br from-honey-300 to-honey-400 text-cocoa-900"
            : "rounded-[1.1rem] rounded-bl-md border border-cream-300 bg-cream-50 text-cocoa-700",
        ].join(" ")}
      >
        {children}
        {reaction ? (
          <span className="absolute -bottom-2.5 right-2 rounded-full border border-cream-300 bg-cream-50 px-1.5 text-[0.7rem] shadow-honey-sm">
            {reaction}
          </span>
        ) : null}
      </div>
    </div>
  );
}
