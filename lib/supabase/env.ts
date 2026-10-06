export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function serviceRoleConfigured() {
  return Boolean(supabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * When Supabase is not configured we run a file-backed dev store so the app
 * is still fully clickable locally. Never enabled when real keys exist.
 */
export function devModeEnabled() {
  return !supabaseConfigured();
}
