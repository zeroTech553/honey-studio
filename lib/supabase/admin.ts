import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, serviceRoleConfigured } from "./env";

let admin: SupabaseClient | null = null;

/**
 * Service-role client. Server-only — never import this from a "use client"
 * module. Used for seeding, summarisation jobs and account deletion.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  if (!serviceRoleConfigured()) return null;
  if (!admin) {
    admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
