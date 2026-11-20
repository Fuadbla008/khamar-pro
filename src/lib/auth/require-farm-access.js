import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireFarmAccess(farmId) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/f/${farmId}/dashboard`);
  }

  const { data: membership } = await supabase
    .from("farm_members")
    .select("role, permissions")
    .eq("farm_id", farmId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!membership) {
    redirect("/");
  }

  return {
    supabase,
    user,
    role: membership.role,
    permissions: membership.permissions ?? {},
  };
}
