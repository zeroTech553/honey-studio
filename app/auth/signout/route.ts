import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEV_COOKIE, DEV_EMAIL_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();

  const res = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  res.cookies.delete(DEV_COOKIE);
  res.cookies.delete(DEV_EMAIL_COOKIE);
  return res;
}
