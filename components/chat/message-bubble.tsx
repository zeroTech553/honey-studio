"use client";

import { motion } from "framer-motion";
import { cn, formatClock } from "@/lib/utils";
import type { ChatMessage } from "./types";

export function MessageBubble({
  message,
  accent,
  showTime,
  onRetry,
}: {
  message: ChatMessage;
  accent: string;
  showTime: boolean;
  onRetry?: (m: ChatMessage) => void;
}) {
  const isUser = message.role === "user";
  const failed = message.status === "failed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative max-w-[min(82%,34rem)]",
          message.reaction ? "mb-3.5" : "mb-0.5",
        )}
      >
        <div
          className={cn(
            "px-4 py-2.5 text-[0.95rem] leading-relaxed shadow-honey-sm transition",
            isUser
              ? "rounded-[1.35rem] rounded-br-lg bg-gradient-to-br from-honey-300 to-honey-400 text-cocoa-900"
              : "rounded-[1.35rem] rounded-bl-lg border border-cream-300 bg-cream-50 text-cocoa-700",
            failed && "opacity-60 ring-1 ring-blush-400",
          )}
          style={
            !isUser
              ? { borderLeft: `3px solid ${accent}40` }
              : undefined
          }
        >
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
        </div>

        {message.reaction ? (
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className={cn(
              "absolute -bottom-3 rounded-full border border-cream-300 bg-cream-50 px-1.5 py-0.5 text-[0.8rem] shadow-honey-sm",
              isUser ? "right-3" : "left-3",
            )}
          >
            {message.reaction}
          </motion.span>
        ) : null}

        <div
          className={cn(
            "mt-1 flex items-center gap-1.5 px-1 text-[0.68rem] text-cocoa-400",
            isUser ? "justify-end" : "justify-start",
          )}
        >
          {failed ? (
            <button
              onClick={() => onRetry?.(message)}
              className="font-medium text-[#b8415c] underline decoration-dotted underline-offset-2"
            >
              not sent · tap to retry
            </button>
          ) : (
            <>
              {showTime ? <span>{formatClock(message.created_at)}</span> : null}
              {isUser ? <Ticks status={message.status} /> : null}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Ticks({ status }: { status: ChatMessage["status"] }) {
  if (status === "sending") {
    return (
      <span className="inline-block size-2.5 animate-spin rounded-full border border-cocoa-400/40 border-t-cocoa-500" />
    );
  }
  const seen = status === "seen";
  const double = status === "delivered" || seen;
  return (
    <span
      className={cn("inline-flex items-center", seen ? "text-honey-600" : "text-cocoa-400")}
      aria-label={status}
    >
      <svg viewBox="0 0 18 12" className="h-3 w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 6.5L4.2 9.8L10.4 2.6" />
        {double ? <path d="M7.4 9.6L13.6 2.4" opacity="0.95" /> : null}
      </svg>
    </span>
  );
}
