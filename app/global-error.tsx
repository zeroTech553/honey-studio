"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(ellipse 70% 50% at 12% -8%, rgba(255,212,112,.5), transparent 60%), #FFF8EA",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          color: "#614318",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            padding: 40,
            textAlign: "center",
            borderRadius: 32,
            border: "1px solid #F8E3BD",
            background: "linear-gradient(180deg,#FFFDF7,#FFF8EA)",
            boxShadow: "0 40px 70px -32px rgba(217,136,0,.5)",
          }}
        >
          <svg width="72" height="72" viewBox="0 0 64 64" style={{ marginBottom: 16 }}>
            <defs>
              <linearGradient id="ge" x1="16" y1="4" x2="50" y2="60">
                <stop offset="0%" stopColor="#FFE9B0" />
                <stop offset="40%" stopColor="#FFD470" />
                <stop offset="100%" stopColor="#D98800" />
              </linearGradient>
            </defs>
            <path
              d="M32 3.5c0 0 19.5 20.4 19.5 33.6C51.5 48.9 42.8 58 32 58S12.5 48.9 12.5 37.1C12.5 23.9 32 3.5 32 3.5z"
              fill="url(#ge)"
            />
          </svg>
          <h1 style={{ fontSize: 24, margin: "0 0 8px", color: "#3D2A0D" }}>
            Honey Studio hit a snag
          </h1>
          <p style={{ margin: "0 0 24px", color: "#9A7540", lineHeight: 1.6 }}>
            The app crashed while loading. Your messages are saved — try again.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 12, color: "#B89566" }}>ref {error.digest}</p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: 8,
              height: 48,
              padding: "0 28px",
              borderRadius: 16,
              border: "1px solid rgba(242,163,10,.3)",
              background: "linear-gradient(135deg,#FFD470,#F2A30A)",
              color: "#3D2A0D",
              fontWeight: 500,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
