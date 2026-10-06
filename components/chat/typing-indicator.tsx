"use client";

import { motion } from "framer-motion";

export function TypingIndicator({ accent }: { accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.22 }}
      className="flex justify-start"
    >
      <div
        className="flex items-center gap-1.5 rounded-[1.35rem] rounded-bl-lg border border-cream-300 bg-cream-50 px-4 py-3 shadow-honey-sm"
        style={{ borderLeft: `3px solid ${accent}40` }}
        aria-label="typing"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-cocoa-400"
            style={{ animation: `typing-dot 1.2s ${i * 0.15}s infinite ease-in-out` }}
          />
        ))}
      </div>
    </motion.div>
  );
}
