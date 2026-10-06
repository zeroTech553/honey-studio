"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "soft" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-honey-300 via-honey-400 to-honey-500 text-cocoa-900 shadow-honey hover:brightness-105 active:brightness-95 border border-honey-500/30",
  soft: "bg-cream-50/90 text-cocoa-700 border border-cream-300 shadow-honey-sm hover:bg-cream-50 hover:border-honey-300",
  ghost: "text-cocoa-600 hover:bg-cream-200/70",
  outline:
    "border border-honey-400/70 text-cocoa-700 bg-cream-50/60 hover:bg-honey-200/50",
  danger:
    "border border-blush-400/60 bg-blush-300/25 text-[#9b2140] hover:bg-blush-300/40",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl gap-1.5",
  md: "h-11 px-5 text-[0.95rem] rounded-2xl gap-2",
  lg: "h-14 px-7 text-base rounded-[1.25rem] gap-2.5",
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
  }
>(function Button(
  { className, variant = "primary", size = "md", loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98]",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="mr-1 inline-block size-3.5 animate-spin rounded-full border-2 border-cocoa-700/30 border-t-cocoa-700" />
      ) : null}
      {children}
    </button>
  );
});
