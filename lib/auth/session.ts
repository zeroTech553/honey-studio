import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { devModeEnabled } from "@/lib/supabase/env";

export const DEV_COOKIE = "hs_dev_uid";
export const DEV_EMAIL_COOKIE = "hs_dev_email";

export interface AuthUser {
  id: string;
  email: string | null;
  /** From the OAuth provider, used to pre-fill the display name. */
  name: string | null;
  avatarUrl: string | null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const meta = (data.user.user_metadata ?? {}) as Record<string, string>;
    return {
      id: data.user.id,
      email: data.user.email ?? null,
      name: meta.full_name ?? meta.name ?? null,
      avatarUrl: meta.avatar_url ?? meta.picture ?? null,
    };
  }

  if (!devModeEnabled()) return null;
  const jar = await cookies();
  const id = jar.get(DEV_COOKIE)?.value;
  if (!id) return null;
  return {
    id,
    email: jar.get(DEV_EMAIL_COOKIE)?.value ?? "you@honeystudio.dev",
    name: null,
    avatarUrl: null,
  };
}

export async function requireAuthUser(): Promise<AuthUser> {
  const u = await getAuthUser();
  if (!u) throw new UnauthorizedError();
  return u;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}
