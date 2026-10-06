import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import { getAuthUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");
  const repo = await getRepo();

  if (conversationId) {
    const convo = await repo.getConversation(user.id, conversationId);
    if (!convo) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ memories: await repo.listMemories(convo.id) });
  }

  const convos = await repo.listConversations(user.id);
  const grouped = await Promise.all(
    convos.map(async (c) => ({
      conversationId: c.id,
      companionId: c.companion_id,
      memories: await repo.listMemories(c.id),
    })),
  );
  return NextResponse.json({ groups: grouped });
}

export async function DELETE(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const repo = await getRepo();
  await repo.deleteMemory(user.id, id);
  return NextResponse.json({ ok: true });
}
