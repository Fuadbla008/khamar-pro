import "server-only";

// RLS already limits rows to globals plus the caller's farms, so a single
// query is enough. Farm-scoped rows win over globals with the same code.
export async function getCategoryLabels(supabase, farmId, entity) {
  const { data } = await supabase
    .from("categories")
    .select("code, name_bn, farm_id")
    .eq("entity", entity)
    .is("deleted_at", null);

  const labels = new Map();

  for (const row of data ?? []) {
    if (row.farm_id === null) {
      labels.set(row.code, row.name_bn);
    }
  }

  for (const row of data ?? []) {
    if (row.farm_id === farmId) {
      labels.set(row.code, row.name_bn);
    }
  }

  return labels;
}
