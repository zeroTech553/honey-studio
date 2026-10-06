import { HoneyDrop } from "@/components/brand/honey-drop";
import Link from "next/link";

export const metadata = { title: "Offline — Honey Studio" };

export default function OfflinePage() {
  return (
    <main className="honeycomb-field grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-[2rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/80 p-10 text-center shadow-honey-lg">
        <div className="mb-6 flex justify-center">
          <HoneyDrop size={80} glow idSuffix="-off" className="animate-float opacity-80" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-cocoa-900">
          You&apos;re offline
        </h1>
        <p className="mt-2.5 text-[0.95rem] leading-relaxed text-cocoa-500">
          No connection right now. Everything you&apos;ve said is saved — we&apos;ll pick
          up exactly where you left off.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl border border-honey-500/30 bg-gradient-to-br from-honey-300 via-honey-400 to-honey-500 px-7 font-medium text-cocoa-900 shadow-honey"
        >
          Retry
        </Link>
      </div>
    </main>
  );
}
