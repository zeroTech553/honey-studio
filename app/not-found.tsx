import Link from "next/link";
import { HoneyDrop } from "@/components/brand/honey-drop";

export default function NotFound() {
  return (
    <main className="honeycomb-field grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-[2rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/80 p-10 text-center shadow-honey-lg">
        <div className="mb-6 flex justify-center">
          <HoneyDrop size={84} glow idSuffix="-404" className="animate-float" />
        </div>
        <p className="font-display text-5xl font-semibold text-gradient-honey">404</p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-cocoa-900">
          This page drifted off
        </h1>
        <p className="mt-2.5 text-[0.95rem] leading-relaxed text-cocoa-500">
          We looked everywhere — even under the honey jar. Let&apos;s get you back
          somewhere warm.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl border border-honey-500/30 bg-gradient-to-br from-honey-300 via-honey-400 to-honey-500 px-7 font-medium text-cocoa-900 shadow-honey transition hover:brightness-105"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
