import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { resolveResume } from "@/lib/onboarding";
import { IntroScroll } from "@/components/landing/intro-scroll";
import { devModeEnabled } from "@/lib/supabase/env";
import { COMPANIONS } from "@/lib/companions/data";
import { presenceFor } from "@/lib/companions/status";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ signin?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const user = await getAuthUser();

  if (user) {
    const resume = await resolveResume(user);
    redirect(resume.href);
  }

  // Server-computed so the marquee shows the same status for everyone.
  const now = new Date();
  const preview = COMPANIONS.slice(0, 6).map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    countryFlag: c.countryFlag,
    tagline: c.tagline,
    avatarFrom: c.avatarFrom,
    avatarTo: c.avatarTo,
    gender: c.gender,
    presence: presenceFor(c, now),
  }));

  return (
    <IntroScroll
      preview={preview}
      devMode={devModeEnabled()}
      openSignup={sp.signin === "1"}
      nextPath={sp.next}
    />
  );
}
