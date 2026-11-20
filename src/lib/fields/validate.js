import "server-only";

import { cleanFieldValues, resolveDefinitions } from "./resolve";
import { schemaFromFields } from "./schema";

// Shared server-side validation for the JSONB `custom_fields` payload. The
// client validates for UX; this is the authoritative check before a write.
export async function validateCustomFields(
  formData,
  supabase,
  farmId,
  entity
) {
  let raw;
  try {
    raw = JSON.parse(String(formData.get("custom_fields") ?? "{}"));
  } catch {
    return { error: "অতিরিক্ত তথ্যের বিন্যাস ভুল" };
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "অতিরিক্ত তথ্যের বিন্যাস ভুল" };
  }

  const { data } = await supabase
    .from("field_definitions")
    .select("*")
    .or(`farm_id.eq.${farmId},farm_id.is.null`)
    .eq("entity", entity)
    .eq("is_active", true);

  const definitions = resolveDefinitions(data, farmId);
  const result = schemaFromFields(definitions).safeParse(cleanFieldValues(raw));

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  return { value: result.data };
}
