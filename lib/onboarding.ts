import "server-only";
import { getRepo } from "@/lib/db";
import type { AuthUser } from "@/lib/auth/session";

export type OnboardingStep = "signup" | "age" | "gender" | "pick" | "chat";

export interface ResumeState {
  step: OnboardingStep;
  /** Where to send the user right now. */
  href: string;
  companionId?: string;
  conversationId?: string;
}

/**
 * After login we resume onboarding exactly where the user left off:
 * age gate → preferred gender → pick a companion → chat.
 */
export async function resolveResume(user: AuthUser | null): Promise<ResumeState> {
  if (!user) return { step: "signup", href: "/?signin=1" };

  const repo = await getRepo();
  const profile = await repo.getProfile(user.id);

  if (!profile?.age_confirmed_at) return { step: "age", href: "/start?step=age" };
  if (!profile.preferred_gender) return { step: "gender", href: "/start?step=gender" };

  const convos = await repo.listConversations(user.id);
  const active = convos[0];
  if (!active) return { step: "pick", href: "/start?step=pick" };

  return {
    step: "chat",
    href: `/chat/${active.companion_id}`,
    companionId: active.companion_id,
    conversationId: active.id,
  };
}
