"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HoneyDrop } from "@/components/brand/honey-drop";
import { cn } from "@/lib/utils";

export function SignupCard({
  devMode,
  nextPath = "/start",
  compact = false,
}: {
  devMode: boolean;
  nextPath?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [busy, setBusy] = useState<null | "google" | "email" | "dev">(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      : undefined;

  async function withSupabase<T>(fn: (c: any) => Promise<T>) {
    const { createClient } = await import("@/lib/supabase/client");
    return fn(createClient());
  }

  async function signInGoogle() {
    if (!guard()) return;
    setBusy("google");
    setError(null);
    try {
      await withSupabase((c) =>
        c.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, queryParams: { prompt: "select_account" } },
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach Google sign-in.");
      setBusy(null);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!guard()) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("That email doesn't look right.");
      return;
    }
    setBusy("email");
    setError(null);
    try {
      const { error: err } = await withSupabase<{ error: { message: string } | null }>(
        (c) =>
          c.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
          }),
      );
      if (err) throw new Error(err.message);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the link.");
    } finally {
      setBusy(null);
    }
  }

  async function continueDev() {
    if (!guard()) return;
    setBusy("dev");
    setError(null);
    try {
      const res = await fetch("/api/dev-auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      if (!res.ok) throw new Error("Dev sign-in unavailable.");
      router.push("/start?step=age");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(null);
    }
  }

  function guard() {
    if (!ageOk) {
      setError("Please confirm you're 18 or older to continue.");
      return false;
    }
    return true;
  }

  if (sent) {
    return (
      <div className="rounded-[1.75rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/70 p-8 text-center shadow-honey">
        <HoneyDrop size={56} glow idSuffix="-sent" className="mx-auto animate-float" />
        <h3 className="mt-4 font-display text-xl font-semibold text-cocoa-900">
          Check your inbox
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-cocoa-500">
          We sent a magic link to <span className="font-medium text-cocoa-700">{email}</span>.
          Tap it and you&apos;ll land right back here.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-5 text-sm font-medium text-cocoa-500 underline decoration-honey-400/60 underline-offset-4"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/70 shadow-honey",
        compact ? "p-6" : "p-7 sm:p-8",
      )}
    >
      <div className="mb-5 flex items-center gap-3">
        <HoneyDrop size={38} glow idSuffix="-signup" />
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight text-cocoa-900">
            Create your account
          </h3>
          <p className="text-xs text-cocoa-400">Free to start · no card needed</p>
        </div>
      </div>

      <Button
        onClick={signInGoogle}
        variant="soft"
        size="lg"
        loading={busy === "google"}
        className="w-full"
      >
        <GoogleMark />
        Continue with Google
      </Button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-cream-300" />
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-cocoa-400">
          or
        </span>
        <span className="h-px flex-1 bg-cream-300" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <label className="block">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            className="h-12 w-full rounded-2xl border border-cream-300 bg-cream-50/90 px-4 text-[0.95rem] text-cocoa-700 placeholder:text-cocoa-400/70 focus:border-honey-400 focus:outline-none"
          />
        </label>
        <Button type="submit" size="lg" loading={busy === "email"} className="w-full">
          Email me a magic link
        </Button>
      </form>

      {devMode ? (
        <div className="mt-4 rounded-2xl border border-dashed border-honey-400/60 bg-honey-200/30 p-3.5">
          <p className="text-[0.78rem] leading-relaxed text-cocoa-500">
            <span className="font-semibold text-cocoa-700">Dev mode.</span> Supabase
            isn&apos;t configured, so real auth is off. Add your keys to{" "}
            <code className="rounded bg-cream-200 px-1 py-0.5 text-[0.72rem]">.env.local</code>{" "}
            — or explore with a local demo account.
          </p>
          <Button
            onClick={continueDev}
            variant="outline"
            size="sm"
            loading={busy === "dev"}
            className="mt-2.5 w-full"
          >
            Continue in demo mode
          </Button>
        </div>
      ) : null}

      <label className="mt-5 flex cursor-pointer select-none items-start gap-3">
        <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={ageOk}
            onChange={(e) => {
              setAgeOk(e.target.checked);
              if (e.target.checked) setError(null);
            }}
            className="peer size-5 cursor-pointer appearance-none rounded-md border border-cream-400 bg-cream-50 transition checked:border-honey-500 checked:bg-gradient-to-br checked:from-honey-300 checked:to-honey-500"
          />
          <svg
            viewBox="0 0 16 16"
            className="pointer-events-none absolute size-3.5 opacity-0 transition peer-checked:opacity-100"
            fill="none"
            stroke="#3D2A0D"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8.5l3.2 3.2L13 5" />
          </svg>
        </span>
        <span className="text-[0.82rem] leading-relaxed text-cocoa-500">
          I&apos;m <span className="font-semibold text-cocoa-700">18 or older</span> and I
          understand Honey Studio companions are{" "}
          <span className="font-semibold text-cocoa-700">AI, not real people</span>.
        </span>
      </label>

      {error ? (
        <p className="mt-3 rounded-xl border border-blush-400/50 bg-blush-300/25 px-3 py-2 text-[0.82rem] text-[#9b2140]">
          {error}
        </p>
      ) : null}

      <p className="mt-4 text-[0.72rem] leading-relaxed text-cocoa-400">
        By continuing you agree to our{" "}
        <Link href="/legal/terms" className="underline underline-offset-2 hover:text-cocoa-600">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-cocoa-600">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[1.15rem]" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l3.99-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
