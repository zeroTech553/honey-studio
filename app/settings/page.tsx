import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getRepo } from "@/lib/db";
import { COMPANIONS, getCompanion } from "@/lib/companions/data";
import { SettingsScreen } from "@/components/settings/settings-screen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — Honey Studio" };

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/?signin=1&next=/settings");

  const repo = await getRepo();
  const profile =
    (await repo.getProfile(user.id)) ?? (await repo.upsertProfile(user.id, {}));
  const convos = await repo.listConversations(user.id);

  const conversations = await Promise.all(
    convos.map(async (c) => {
      const companion = getCompanion(c.companion_id);
      return {
        id: c.id,
        companionId: c.companion_id,
        companionName: companion?.name ?? c.companion_id,
        countryFlag: companion?.countryFlag ?? "",
        avatarFrom: companion?.avatarFrom ?? "#FFD470",
        avatarTo: companion?.avatarTo ?? "#F98FA6",
        stage: c.relationship_stage,
        messageCount: c.message_count,
        memoryCount: (await repo.listMemories(c.id)).length,
        lastMessageAt: c.last_message_at,
      };
    }),
  );

  const blocked = (profile.blocked_companions ?? []).map((id) => ({
    id,
    name: getCompanion(id)?.name ?? id,
  }));

  return (
    <SettingsScreen
      email={user.email}
      profile={{
        displayName: profile.display_name ?? "",
        preferredGender: profile.preferred_gender,
        ageConfirmedAt: profile.age_confirmed_at,
      }}
      conversations={conversations}
      blocked={blocked}
      companionCount={COMPANIONS.length}
    />
  );
}
