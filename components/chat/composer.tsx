"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function Composer({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(() => ref.current?.focus());
  }

  return (
    <div className="border-t border-cream-300/70 bg-cream-100/85 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
      <div className="mx-auto flex w-full max-w-3xl items-end gap-2.5">
        <div className="flex flex-1 items-end rounded-[1.5rem] border border-cream-300 bg-cream-50/95 px-4 py-2 shadow-honey-sm transition focus-within:border-honey-400">
          <textarea
            ref={ref}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            className="scroll-hide max-h-[150px] w-full resize-none bg-transparent py-1.5 text-[0.98rem] leading-relaxed text-cocoa-800 outline-none placeholder:text-cocoa-400/80"
          />
        </div>

        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-full border transition-all duration-200 active:scale-95",
            value.trim() && !disabled
              ? "border-honey-500/30 bg-gradient-to-br from-honey-300 via-honey-400 to-honey-500 text-cocoa-900 shadow-honey hover:brightness-105"
              : "border-cream-300 bg-cream-200/70 text-cocoa-400",
          )}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <p className="mx-auto mt-2 w-full max-w-3xl text-center text-[0.68rem] text-cocoa-400">
        AI companion — not a real person. Be kind to yourself.
      </p>
    </div>
  );
}
