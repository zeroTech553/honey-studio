import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import { getAuthUser, DEV_COOKIE, DEV_EMAIL_COOKIE } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { flattenIssues, profileUpdateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", issues: flattenIssues(parsed.error) },
      { status: 400 },
    );
  }

  const repo = await getRepo();
  const current = await repo.getProfile(user.id);
  let blocked = current?.blocked_companions ?? [];
  if (parsed.data.blockCompanionId) {
    blocked = Array.from(new Set([...blocked, parsed.data.blockCompanionId]));
  }
  if (parsed.data.unblockCompanionId) {
    blocked = blocked.filter((id) => id !== parsed.data.unblockCompanionId);
  }
  const touchedBlocked =
    Boolean(parsed.data.blockCompanionId) || Boolean(parsed.data.unblockCompanionId);

  const profile = await repo.upsertProfile(user.id, {
    ...(touchedBlocked ? { blocked_companions: blocked } : {}),
    ...(parsed.data.displayName !== undefined
      ? { display_name: parsed.data.displayName }
      : {}),
    ...(parsed.data.preferredGender !== undefined
      ? { preferred_gender: parsed.data.preferredGender }
      : {}),
    ...(parsed.data.ageConfirmed ? { age_confirmed_at: new Date().toISOString() } : {}),
  });
  return NextResponse.json({ profile });
}

/** Delete my data — wipes every row the user owns, then the auth user. */
export async function DELETE() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const repo = await getRepo();
  await repo.deleteAllUserData(user.id);

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      await admin.auth.admin.deleteUser(user.id).catch((e) => {
        console.error("[account] deleteUser", e);
      });
    }
    await supabase.auth.signOut();
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DEV_COOKIE);
  res.cookies.delete(DEV_EMAIL_COOKIE);
  return res;
}
