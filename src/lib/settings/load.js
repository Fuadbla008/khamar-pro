import "server-only";

import { resolveDefinitions } from "@/lib/fields/resolve";
import { banglaDigitsFromSettings } from "./display";

export async function loadGeneralSettings(supabase, farmId) {
  const [farmResult, settingsResult] = await Promise.all([
    supabase
      .from("farms")
      .select("name, primary_type, address, currency, created_at")
      .eq("id", farmId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase.from("app_settings").select("key, value").eq("farm_id", farmId),
  ]);

  return {
    farm: farmResult.data,
    banglaDigits: banglaDigitsFromSettings(settingsResult.data),
  };
}

export async function loadCategorySettings(supabase, farmId, entity) {
  const { data } = await supabase
    .from("categories")
    .select("*")
    .or(`farm_id.eq.${farmId},farm_id.is.null`)
    .eq("entity", entity)
    .is("deleted_at", null);

  const overriddenCodes = new Set(
    (data ?? []).filter((row) => row.farm_id === farmId).map((row) => row.code)
  );

  return resolveDefinitions(data, farmId, "code").map((row) => ({
    ...row,
    overridden: overriddenCodes.has(row.code),
  }));
}

export async function loadFieldSettings(supabase, farmId, entity) {
  const { data } = await supabase
    .from("field_definitions")
    .select("*")
    .or(`farm_id.eq.${farmId},farm_id.is.null`)
    .eq("entity", entity);

  const overriddenKeys = new Set(
    (data ?? []).filter((row) => row.farm_id === farmId).map((row) => row.key)
  );

  return {
    rows: resolveDefinitions(data, farmId).map((row) => ({
      ...row,
      overridden: overriddenKeys.has(row.key),
    })),
    total: resolveDefinitions(data, farmId).length,
  };
}
