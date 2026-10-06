import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import { getAuthUser } from "@/lib/auth/session";
import { flattenIssues, reportSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = reportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", issues: flattenIssues(parsed.error) },
      { status: 400 },
    );
  }

  const repo = await getRepo();
  const convo = await repo.getConversation(user.id, parsed.data.conversationId);
  if (!convo) return NextResponse.json({ error: "not found" }, { status: 404 });

  await repo.createReport({
    userId: user.id,
    conversationId: convo.id,
    category: parsed.data.category,
    reason: parsed.data.reason,
  });
  return NextResponse.json({ ok: true });
}
