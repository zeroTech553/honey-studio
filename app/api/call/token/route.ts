import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import { getAuthUser } from "@/lib/auth/session";
import { callTokenSchema, flattenIssues } from "@/lib/validation/schemas";
import { createLiveKitToken, livekitConfigured } from "@/lib/call/livekit-token";
import { getCompanion } from "@/lib/companions/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = callTokenSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", issues: flattenIssues(parsed.error) },
      { status: 400 },
    );
  }

  const repo = await getRepo();
  const convo = await repo.getConversation(user.id, parsed.data.conversationId);
  if (!convo) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Not configured yet → the client keeps using the mock provider.
  if (!livekitConfigured()) {
    return NextResponse.json(
      { error: "voice provider not configured" },
      { status: 501 },
    );
  }

  const companion = getCompanion(convo.companion_id);
  const room = `hs_${convo.id}`;

  const token = createLiveKitToken({
    apiKey: process.env.LIVEKIT_API_KEY!,
    apiSecret: process.env.LIVEKIT_API_SECRET!,
    identity: user.id,
    name: user.name ?? "Honey Studio user",
    room,
    metadata: {
      conversationId: convo.id,
      companionId: convo.companion_id,
      voiceId: companion?.voiceId ?? null,
      sessionId: parsed.data.sessionId ?? null,
    },
  });

  return NextResponse.json({
    url: process.env.LIVEKIT_URL,
    token,
    room,
    voiceId: companion?.voiceId ?? null,
  });
}
