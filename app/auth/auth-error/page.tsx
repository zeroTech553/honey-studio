import Link from "next/link";
import { HoneyDrop } from "@/components/brand/honey-drop";

export const metadata = { title: "Sign-in problem — Honey Studio" };

export default function AuthErrorPage() {
  return (
    <main className="honeycomb-field grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-[2rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/80 p-10 text-center shadow-honey-lg">
        <HoneyDrop size={72} glow idSuffix="-autherr" className="mx-auto animate-float" />
        <h1 className="mt-5 font-display text-2xl font-semibold text-cocoa-900">
          That link didn&apos;t work
        </h1>
        <p className="mt-2.5 text-[0.95rem] leading-relaxed text-cocoa-500">
          Magic links expire after a little while, and they can only be used once. Ask for
          a fresh one and you&apos;ll be straight in.
        </p>
        <Link
          href="/?signin=1"
          className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl border border-honey-500/30 bg-gradient-to-br from-honey-300 via-honey-400 to-honey-500 px-7 font-medium text-cocoa-900 shadow-honey"
        >
          Send a new link
        </Link>
      </div>
    </main>
  );
}
