import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getRepo } from "@/lib/db";
import { getCompanion } from "@/lib/companions/data";
import { presenceFor } from "@/lib/companions/status";
import { ChatScreen } from "@/components/chat/chat-screen";
import type { ChatMessage } from "@/components/chat/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ companionId: string }>;
}) {
  const { companionId } = await params;
  const c = getCompanion(companionId);
  return { title: c ? `${c.name} — Honey Studio` : "Honey Studio" };
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ companionId: string }>;
}) {
  const { companionId } = await params;
  const companion = getCompanion(companionId);
  if (!companion) notFound();

  const user = await getAuthUser();
  if (!user) redirect(`/?signin=1&next=/chat/${companionId}`);

  const repo = await getRepo();
  const profile = await repo.getProfile(user.id);
  if (!profile?.age_confirmed_at) redirect("/start?step=age");

  const convo = await repo.getOrCreateConversation(user.id, companion.id);
  const rows = await repo.listMessages(convo.id, 200);

  const initialMessages: ChatMessage[] = rows.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    reaction: m.reaction,
    status: m.role === "user" ? "seen" : "sent",
    meta: (m.meta as Record<string, unknown> | null) ?? null,
    created_at: m.created_at,
  }));

  return (
    <ChatScreen
      companion={companion}
      conversationId={convo.id}
      initialMessages={initialMessages}
      initialPresence={presenceFor(companion)}
      initialStage={convo.relationship_stage}
    />
  );
}
