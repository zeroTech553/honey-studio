import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import { getAuthUser } from "@/lib/auth/session";
import {
  callSessionCreateSchema,
  callSessionEndSchema,
  flattenIssues,
} from "@/lib/validation/schemas";
import { formatDuration } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start a call session. */
export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = callSessionCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", issues: flattenIssues(parsed.error) },
      { status: 400 },
    );
  }

  const repo = await getRepo();
  const convo = await repo.getConversation(user.id, parsed.data.conversationId);
  if (!convo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const session = await repo.createCallSession({
    conversationId: convo.id,
    initiatedBy: parsed.data.initiatedBy,
    status: parsed.data.status,
  });
  return NextResponse.json({ session });
}

/** End (or decline) a call session and write the transcript line. */
export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = callSessionEndSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", issues: flattenIssues(parsed.error) },
      { status: 400 },
    );
  }
  const { sessionId, conversationId, durationSeconds, status } = parsed.data;

  const repo = await getRepo();
  const convo = await repo.getConversation(user.id, conversationId);
  if (!convo) return NextResponse.json({ error: "not found" }, { status: 404 });

  await repo.endCallSession(sessionId, durationSeconds, status);

  // Only completed calls leave a transcript line.
  let systemMessage = null;
  if (status === "completed") {
    systemMessage = await repo.insertMessage({
      conversationId: convo.id,
      role: "system",
      content: `Call · ${formatDuration(durationSeconds)}`,
      meta: { kind: "call_log", sessionId, durationSeconds },
    });
  }

  return NextResponse.json({ ok: true, systemMessage });
}
