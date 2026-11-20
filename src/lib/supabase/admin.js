import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabaseEnv } from "@/lib/env";

// Bypasses RLS. Only for trusted server code (invite redemption helpers,
// maintenance). Never import from a Client Component.
export function createAdminClient() {
  const { url } = getSupabaseEnv();

  return createSupabaseClient(url, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
