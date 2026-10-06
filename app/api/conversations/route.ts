import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import { getAuthUser } from "@/lib/auth/session";
import { getCompanion } from "@/lib/companions/data";
import { createConversationSchema, flattenIssues } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const repo = await getRepo();
  const conversations = await repo.listConversations(user.id);
  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createConversationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", issues: flattenIssues(parsed.error) },
      { status: 400 },
    );
  }
  if (!getCompanion(parsed.data.companionId)) {
    return NextResponse.json({ error: "unknown companion" }, { status: 404 });
  }

  const repo = await getRepo();
  const conversation = await repo.getOrCreateConversation(
    user.id,
    parsed.data.companionId,
  );
  return NextResponse.json({ conversation });
}
