"use client";

import { BrandedFallback } from "@/components/error-boundary";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <BrandedFallback
      title="That didn't go to plan"
      body="Something broke on our side. Give it another go — your conversation is safe."
      detail={error.digest ? `ref ${error.digest}` : error.message}
      onRetry={reset}
    />
  );
}
