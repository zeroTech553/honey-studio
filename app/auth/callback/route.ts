import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Supabase OAuth + magic-link landing route (PKCE code exchange). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/start";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const forwardedHost = request.headers.get("x-forwarded-host");
        const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
        const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;
        return NextResponse.redirect(`${base}${next}`);
      }
      console.error("[auth/callback]", error.message);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-error`);
}
