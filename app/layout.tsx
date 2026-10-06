import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "Honey Studio — your AI companion",
  description:
    "Warm, human-feeling AI companions you can text and call. Honey Studio is for adults, and every companion is an AI — never a real person.",
  applicationName: "Honey Studio",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "Honey Studio",
    description: "Warm, human-feeling AI companions you can text and call.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFF8EA",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Loaded at runtime so the build never depends on the font CDN.
            Both families degrade to a warm system stack (see globals.css). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh antialiased">
        <AppErrorBoundary>{children}</AppErrorBoundary>
      </body>
    </html>
  );
}
