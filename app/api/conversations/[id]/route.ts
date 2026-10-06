import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import { getAuthUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const repo = await getRepo();
  const convo = await repo.getConversation(user.id, id);
  if (!convo) return NextResponse.json({ error: "not found" }, { status: 404 });

  await repo.deleteConversation(user.id, id);
  return NextResponse.json({ ok: true });
}
