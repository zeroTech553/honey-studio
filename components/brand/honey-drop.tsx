import { cn } from "@/lib/utils";

/**
 * HoneyDrop — the Honey Studio brand mark.
 *
 * Always rendered as a warm multi-stop honey gradient with a highlight.
 * Never flatten this to a single dark colour (brand rule).
 */
export function HoneyDrop({
  className,
  size = 40,
  glow = false,
  idSuffix = "",
}: {
  className?: string;
  size?: number;
  glow?: boolean;
  idSuffix?: string;
}) {
  const gid = `hd-grad${idSuffix}`;
  const sid = `hd-shine${idSuffix}`;
  const rid = `hd-rim${idSuffix}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Honey Studio"
      className={cn(
        glow && "drop-shadow-[0_8px_22px_rgba(242,163,10,0.45)]",
        className,
      )}
    >
      <defs>
        <linearGradient id={gid} x1="16" y1="4" x2="50" y2="60">
          <stop offset="0%" stopColor="#FFE9B0" />
          <stop offset="32%" stopColor="#FFD470" />
          <stop offset="68%" stopColor="#F2A30A" />
          <stop offset="100%" stopColor="#D98800" />
        </linearGradient>
        <radialGradient id={sid} cx="0.36" cy="0.3" r="0.42">
          <stop offset="0%" stopColor="#FFFDF7" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFFDF7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={rid} x1="10" y1="60" x2="54" y2="8">
          <stop offset="0%" stopColor="#F98FA6" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFE9B0" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* drop silhouette */}
      <path
        d="M32 3.5c0 0 19.5 20.4 19.5 33.6C51.5 48.9 42.8 58 32 58S12.5 48.9 12.5 37.1C12.5 23.9 32 3.5 32 3.5z"
        fill={`url(#${gid})`}
      />
      <path
        d="M32 3.5c0 0 19.5 20.4 19.5 33.6C51.5 48.9 42.8 58 32 58S12.5 48.9 12.5 37.1C12.5 23.9 32 3.5 32 3.5z"
        stroke={`url(#${rid})`}
        strokeWidth="1.6"
      />

      {/* inner honeycomb cell — the "studio" wink */}
      <path
        d="M32 27.2l7.6 4.4v8.8L32 44.8l-7.6-4.4v-8.8z"
        fill="#FFFDF7"
        fillOpacity="0.5"
      />
      <path
        d="M32 27.2l7.6 4.4v8.8L32 44.8l-7.6-4.4v-8.8z"
        stroke="#FFFDF7"
        strokeOpacity="0.85"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />

      {/* highlight */}
      <ellipse cx="24" cy="24" rx="7.5" ry="10" fill={`url(#${sid})`} />
    </svg>
  );
}

export function HoneyWordmark({
  className,
  size = 34,
  subtitle,
  idSuffix = "-wm",
}: {
  className?: string;
  size?: number;
  subtitle?: string;
  idSuffix?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <HoneyDrop size={size} idSuffix={idSuffix} glow />
      <span className="leading-none">
        <span className="block font-display text-[1.15em] font-semibold tracking-tight text-cocoa-900">
          Honey <span className="text-gradient-honey">Studio</span>
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-[0.62em] font-medium uppercase tracking-[0.22em] text-cocoa-400">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
