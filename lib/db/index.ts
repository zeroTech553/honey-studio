import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SupabaseRepo } from "./supabase-repo";
import { DevRepo } from "./dev-repo";
import type { HoneyRepo } from "./types";

export * from "./types";

let devRepo: DevRepo | null = null;

/**
 * Request-scoped repository. Uses the RLS-enforced Supabase client when
 * configured, otherwise the dev JSON store.
 */
export async function getRepo(): Promise<HoneyRepo> {
  const db = await createSupabaseServerClient();
  if (db) return new SupabaseRepo(db);
  if (!devRepo) devRepo = new DevRepo();
  return devRepo;
}
