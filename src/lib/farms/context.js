import "server-only";

import { slugifyFarmName } from "@/lib/export/filename";

// Filenames need a short, safe farm identifier. Farm names are usually Bengali,
// so slugifyFarmName() falls back to a farm-id fragment when no Latin characters
// remain. RLS already restricts this read to farms the caller belongs to.
export async function loadFarmSlug(supabase, farmId) {
  const { data: farm } = await supabase
    .from("farms")
    .select("name")
    .eq("id", farmId)
    .is("deleted_at", null)
    .maybeSingle();

  return slugifyFarmName(farm?.name, farmId);
}
