"use client";

import { motion } from "framer-motion";
import { CRISIS_RESOURCES } from "@/lib/safety/rules";

/**
 * Gentle in-chat crisis-support card. Rendered for system messages with
 * meta.kind === "crisis_card". Deliberately calm — no red alarm styling.
 */
export function CrisisCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-md rounded-[1.5rem] border border-honey-400/50 bg-gradient-to-b from-cream-50 to-honey-200/40 p-5 shadow-honey-sm"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-honey-200 to-honey-400 text-base">
          🤍
        </span>
        <div>
          <p className="font-display text-[1.02rem] font-semibold text-cocoa-900">
            You don&apos;t have to carry this alone
          </p>
          <p className="mt-1.5 text-[0.86rem] leading-relaxed text-cocoa-600">
            If things feel heavy right now, talking to a real person helps. These lines are
            free, confidential, and open right now.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {CRISIS_RESOURCES.map((r) => (
          <li key={r.name}>
            <a
              href={r.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-cream-300 bg-cream-50/80 px-3.5 py-2.5 transition hover:border-honey-400 hover:bg-cream-50"
            >
              <span>
                <span className="block text-[0.88rem] font-medium text-cocoa-800">
                  {r.name}
                </span>
                <span className="block text-[0.76rem] text-cocoa-400">{r.detail}</span>
              </span>
              <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-cocoa-400">
                {r.region}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-3.5 text-[0.74rem] leading-relaxed text-cocoa-400">
        If you&apos;re in immediate danger, please contact your local emergency number.
      </p>
    </motion.div>
  );
}
