import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getRepo } from "@/lib/db";
import { COMPANIONS } from "@/lib/companions/data";
import { presenceFor } from "@/lib/companions/status";
import { OnboardingFlow, type OnboardingCompanion } from "@/components/onboarding/onboarding-flow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get started — Honey Studio" };

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/?signin=1&next=/start");

  const sp = await searchParams;
  const repo = await getRepo();
  const profile =
    (await repo.getProfile(user.id)) ??
    (await repo.upsertProfile(user.id, { display_name: user.name ?? null }));

  const now = new Date();
  const blocked = new Set(profile.blocked_companions ?? []);
  const companions: OnboardingCompanion[] = COMPANIONS.filter(
    (c) => !blocked.has(c.id),
  ).map((c) => ({
    id: c.id,
    name: c.name,
    age: c.age,
    gender: c.gender,
    city: c.city,
    country: c.country,
    countryFlag: c.countryFlag,
    tagline: c.tagline,
    bio: c.bio,
    tags: c.tags,
    languages: c.languages,
    avatarFrom: c.avatarFrom,
    avatarTo: c.avatarTo,
    presence: presenceFor(c, now),
  }));

  const requested = sp.step;
  const step =
    requested === "pick" || requested === "gender" || requested === "age"
      ? requested
      : !profile.age_confirmed_at
        ? "age"
        : !profile.preferred_gender
          ? "gender"
          : "pick";

  return (
    <OnboardingFlow
      initialStep={step}
      companions={companions}
      profile={{
        displayName: profile.display_name ?? user.name ?? "",
        preferredGender: profile.preferred_gender,
        ageConfirmed: Boolean(profile.age_confirmed_at),
      }}
      email={user.email}
    />
  );
}
