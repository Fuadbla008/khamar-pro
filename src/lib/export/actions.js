"use server";

import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import {
  assembleExportBundle,
  assembleFarmBackup,
  assembleMemberBundle,
} from "./bundle-helpers";

// Thin Server Action layer: authentication/authorization happens here, all
// serializable payload building lives in the non-action bundle-helpers module.

export async function buildExportBundle(farmId, options = {}) {
  const { supabase, user, role } = await requireFarmAccess(farmId);
  return assembleExportBundle(supabase, { farmId, user, role, options });
}

export async function buildMemberBundle(farmId, memberId) {
  const { supabase, user, role } = await requireFarmAccess(farmId);
  return assembleMemberBundle(supabase, { farmId, user, role, memberId });
}

export async function buildFarmBackup(farmId) {
  const { supabase, user, role } = await requireFarmAccess(farmId);
  return assembleFarmBackup(supabase, { farmId, user, role });
}
