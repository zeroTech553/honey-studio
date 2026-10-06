import Link from "next/link";
import { HoneyWordmark } from "@/components/brand/honey-drop";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="honeycomb-field min-h-dvh pb-24">
      <header className="sticky top-0 z-30 border-b border-cream-300/70 bg-cream-100/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5">
          <Link href="/">
            <HoneyWordmark size={28} className="text-[0.95rem]" />
          </Link>
          <div className="flex gap-3 text-sm font-medium text-cocoa-500">
            <Link href="/legal/terms" className="hover:text-cocoa-700">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-cocoa-700">
              Privacy
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <article className="rounded-[1.75rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/70 p-7 shadow-honey-sm sm:p-10 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:text-cocoa-900 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-cocoa-900 [&_li]:mt-1.5 [&_li]:text-[0.94rem] [&_li]:leading-relaxed [&_li]:text-cocoa-600 [&_p]:mt-3 [&_p]:text-[0.94rem] [&_p]:leading-relaxed [&_p]:text-cocoa-600 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </article>
      </main>
    </div>
  );
}
