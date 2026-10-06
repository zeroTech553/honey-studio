"use client";

import React from "react";
import { HoneyDrop } from "@/components/brand/honey-drop";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Branded error boundary. Never shows a white screen of death — always the
 * cream/honey surface with the HoneyDrop.
 */
export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Something went sideways.",
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("[error-boundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <BrandedFallback
        title="Something got a little sticky"
        body="A part of the app stopped responding. Reloading usually sorts it out."
        detail={this.state.message}
        onRetry={() => this.setState({ hasError: false })}
      />
    );
  }
}

export function BrandedFallback({
  title,
  body,
  detail,
  onRetry,
  action,
}: {
  title: string;
  body: string;
  detail?: string;
  onRetry?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <main className="honeycomb-field grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-[2rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/80 p-9 text-center shadow-honey-lg">
        <div className="mb-5 flex justify-center">
          <HoneyDrop size={72} glow idSuffix="-err" className="animate-float" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-cocoa-900">{title}</h1>
        <p className="mt-2.5 text-[0.95rem] leading-relaxed text-cocoa-500">{body}</p>
        {detail ? (
          <p className="mt-4 rounded-xl border border-cream-300 bg-cream-200/50 px-3 py-2 text-xs text-cocoa-400">
            {detail}
          </p>
        ) : null}
        <div className="mt-7 flex flex-col gap-2.5">
          {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
          {action}
          <a
            href="/"
            className="text-sm font-medium text-cocoa-500 underline decoration-honey-400/60 underline-offset-4 hover:text-cocoa-700"
          >
            Back to Honey Studio
          </a>
        </div>
      </div>
    </main>
  );
}
