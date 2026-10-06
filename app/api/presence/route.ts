import { NextResponse } from "next/server";
import { COMPANIONS, getCompanion } from "@/lib/companions/data";
import { presenceFor } from "@/lib/companions/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Presence is simulated per companion timezone but computed HERE so every
 * client (and the model's dynamic context) sees the same answer.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("companionId");
  const now = new Date();

  if (id) {
    const c = getCompanion(id);
    if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ presence: presenceFor(c, now) });
  }

  return NextResponse.json({
    presence: Object.fromEntries(
      COMPANIONS.map((c) => [c.id, presenceFor(c, now)]),
    ),
  });
}
