import "server-only";

import { resolveDefinitions } from "./resolve";

async function loadDefinitions(supabase, farmId, entity) {
  const { data } = await supabase
    .from("field_definitions")
    .select("*")
    .or(`farm_id.eq.${farmId},farm_id.is.null`)
    .eq("entity", entity)
    .eq("is_active", true);

  return resolveDefinitions(data, farmId);
}

export function loadAnimalDefinitions(supabase, farmId) {
  return loadDefinitions(supabase, farmId, "animal");
}

export function loadTransactionDefinitions(supabase, farmId) {
  return loadDefinitions(supabase, farmId, "transaction");
}

export function loadInventoryDefinitions(supabase, farmId) {
  return loadDefinitions(supabase, farmId, "inventory");
}

export function loadHealthDefinitions(supabase, farmId) {
  return loadDefinitions(supabase, farmId, "health");
}

export function loadProductionDefinitions(supabase, farmId) {
  return loadDefinitions(supabase, farmId, "production");
}
