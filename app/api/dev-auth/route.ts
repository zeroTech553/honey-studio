import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { devModeEnabled } from "@/lib/supabase/env";
import { DEV_COOKIE, DEV_EMAIL_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DEV-ONLY sign-in. Only reachable when Supabase env vars are absent — it is a
 * hard 404 the moment real credentials exist. Lets you click through the whole
 * product without a backend.
 */
export async function POST(req: Request) {
  if (!devModeEnabled()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as { email?: string };

  const res = NextResponse.json({ ok: true });
  const oneWeek = 60 * 60 * 24 * 7;
  res.cookies.set(DEV_COOKIE, randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: oneWeek,
  });
  res.cookies.set(DEV_EMAIL_COOKIE, body.email?.slice(0, 120) || "you@honeystudio.dev", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: oneWeek,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DEV_COOKIE);
  res.cookies.delete(DEV_EMAIL_COOKIE);
  return res;
}
