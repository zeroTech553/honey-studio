import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getRepo } from "@/lib/db";
import { getCompanion } from "@/lib/companions/data";
import { MemoryScreen, type MemoryGroup } from "@/components/settings/memory-screen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Memory — Honey Studio" };

export default async function MemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/?signin=1&next=/settings/memory");

  const sp = await searchParams;
  const repo = await getRepo();
  const convos = await repo.listConversations(user.id);
  const filtered = sp.conversationId
    ? convos.filter((c) => c.id === sp.conversationId)
    : convos;

  const groups: MemoryGroup[] = await Promise.all(
    filtered.map(async (c) => {
      const companion = getCompanion(c.companion_id);
      return {
        conversationId: c.id,
        companionName: companion?.name ?? c.companion_id,
        countryFlag: companion?.countryFlag ?? "",
        avatarFrom: companion?.avatarFrom ?? "#FFD470",
        avatarTo: companion?.avatarTo ?? "#F98FA6",
        summary: c.summary,
        memories: (await repo.listMemories(c.id)).map((m) => ({
          id: m.id,
          fact: m.fact,
          createdAt: m.created_at,
        })),
      };
    }),
  );

  return <MemoryScreen groups={groups} />;
}
