import { cn } from "@/lib/utils";
import type { Companion } from "@/lib/companions/types";
import type { PresenceState } from "@/lib/companions/status";

const DOT: Record<PresenceState, string> = {
  online: "bg-mint-400",
  "typing-soon": "bg-mint-400",
  away: "bg-honey-400",
  asleep: "bg-cocoa-400",
};

export function CompanionAvatar({
  companion,
  size = 56,
  presence,
  ring = true,
  className,
}: {
  companion: Pick<Companion, "name" | "avatarFrom" | "avatarTo" | "countryFlag" | "id">;
  size?: number;
  presence?: PresenceState;
  ring?: boolean;
  className?: string;
}) {
  const letter = companion.name.charAt(0).toUpperCase();
  const dotSize = Math.max(10, Math.round(size * 0.22));

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          "flex size-full items-center justify-center overflow-hidden rounded-full",
          ring && "ring-2 ring-cream-50 ring-offset-1 ring-offset-honey-200/60",
        )}
        style={{
          background: `linear-gradient(145deg, ${companion.avatarFrom}, ${companion.avatarTo})`,
        }}
      >
        <span
          className="honeycomb-field absolute inset-0 opacity-45"
          aria-hidden
        />
        <span
          className="relative font-display font-semibold text-cream-50 drop-shadow-[0_1px_3px_rgba(97,67,24,0.4)]"
          style={{ fontSize: size * 0.42 }}
        >
          {letter}
        </span>
      </span>

      <span
        className="pointer-events-none absolute -bottom-0.5 -left-0.5 grid place-items-center rounded-full bg-cream-50 shadow-honey-sm"
        style={{ width: dotSize * 1.5, height: dotSize * 1.5, fontSize: dotSize }}
        aria-hidden
      >
        {companion.countryFlag}
      </span>

      {presence ? (
        <span
          className={cn(
            "absolute -right-0 -top-0 rounded-full border-2 border-cream-50",
            DOT[presence],
            presence === "online" && "animate-pulse-soft",
          )}
          style={{ width: dotSize, height: dotSize }}
          aria-label={presence}
        />
      ) : null}
    </span>
  );
}
