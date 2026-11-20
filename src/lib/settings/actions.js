"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { can } from "@/lib/auth/can";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { resolveDefinitions } from "@/lib/fields/resolve";
import { CONFIGURABLE_ENTITIES, FIELD_TYPES, MAX_FIELDS_PER_ENTITY } from "./constants";
import { DISPLAY_SETTINGS_KEY } from "./display";

const slugPattern = /^[a-z][a-z0-9_]*$/;
const entities = CONFIGURABLE_ENTITIES.map((item) => item.value);

const settingsSchema = z.object({
  farmId: z.uuid(),
  name: z.string().trim().min(1, "খামারের নাম দিন").max(80, "নাম অনেক বড়"),
  address: z.string().trim().max(200, "ঠিকানা অনেক বড়"),
});

function revalidateSettings(farmId) {
  for (const path of [
    `/f/${farmId}/settings`,
    `/f/${farmId}/settings/categories`,
    `/f/${farmId}/settings/fields`,
    `/f/${farmId}/dashboard`,
    `/f/${farmId}/animals`,
    `/f/${farmId}/transactions`,
    `/f/${farmId}/inventory`,
    `/f/${farmId}/health`,
  ]) {
    revalidatePath(path);
  }
}

function text(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData, key) {
  return text(formData, key) || null;
}

function entityFrom(formData) {
  const entity = text(formData, "entity");
  return entities.includes(entity) ? entity : null;
}

// ---------------------------------------------------------------------------
// General settings
// ---------------------------------------------------------------------------

export async function updateFarmSettingsAction(_prevState, formData) {
  const parsed = settingsSchema.safeParse({
    farmId: text(formData, "farmId"),
    name: text(formData, "name"),
    address: text(formData, "address"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { farmId, name, address } = parsed.data;
  const { supabase, role, permissions } = await requireFarmAccess(farmId);

  if (!can(role, permissions, "can_manage_settings")) {
    return { error: "সেটিংস বদলানোর অনুমতি নেই" };
  }

  // farms RLS is owner-only, so a manager can only change app_settings.
  if (role === "owner") {
    const { error } = await supabase
      .from("farms")
      .update({ name, address })
      .eq("id", farmId)
      .is("deleted_at", null);

    if (error) return { error: "খামারের তথ্য সংরক্ষণ করা যায়নি" };
  }

  const displayValue = { bangla_digits: formData.get("banglaDigits") === "on" };
  const { data: existing } = await supabase
    .from("app_settings")
    .select("id")
    .eq("farm_id", farmId)
    .eq("key", DISPLAY_SETTINGS_KEY)
    .maybeSingle();

  const { error: settingsError } = existing
    ? await supabase
        .from("app_settings")
        .update({ value: displayValue })
        .eq("id", existing.id)
    : await supabase.from("app_settings").insert({
        farm_id: farmId,
        key: DISPLAY_SETTINGS_KEY,
        value: displayValue,
      });

  if (settingsError) {
    return { error: "প্রদর্শন সেটিংস সংরক্ষণ করা যায়নি" };
  }

  revalidateSettings(farmId);
  return { ok: true };
}

export async function archiveFarmAction(_prevState, formData) {
  const farmId = text(formData, "farmId");
  const { supabase, role } = await requireFarmAccess(farmId);
  if (role !== "owner") return { error: "শুধু মালিকই খামার আর্কাইভ করতে পারেন" };

  if (text(formData, "confirmation") !== text(formData, "farmName")) {
    return { error: "নিশ্চিত করতে খামারের নাম টাইপ করুন" };
  }

  const { error } = await supabase.rpc("archive_farm", { p_farm_id: farmId });
  if (error) return;

  redirect("/");
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

async function ownCategory(supabase, farmId, entity, code) {
  // Codes are only unique within an entity (feed exists for both transaction
  // and inventory), so every lookup must be scoped by entity too.
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("farm_id", farmId)
    .eq("entity", entity)
    .eq("code", code)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? null;
}

async function globalCategory(supabase, entity, code) {
  const { data } = await supabase
    .from("categories")
    .select("*")
    .is("farm_id", null)
    .eq("entity", entity)
    .eq("code", code)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? null;
}

// Global rows are read-only to clients, so editing one means inserting a
// farm-scoped copy with the same immutable code (a full override). Existing
// farm rows are updated in place; the code never changes.
async function writeCategory(supabase, farmId, user, entity, code, patch) {
  const own = await ownCategory(supabase, farmId, entity, code);
  const base = own ?? (await globalCategory(supabase, entity, code));
  // A brand-new custom category has no template; its form patch is complete.
  // Archive/move always target an existing row, so a missing base is an error.
  if (!base && !patch.name_bn) {
    return { error: "ক্যাটাগরি খুঁজে পাওয়া যায়নি" };
  }

  const payload = base
    ? {
        name: base.name,
        name_bn: base.name_bn,
        icon: base.icon,
        color: base.color,
        parent_id: base.parent_id,
        transaction_type: base.transaction_type,
        sort_order: base.sort_order,
        is_active: base.is_active,
        ...patch,
      }
    : { ...patch };

  const { error } = own
    ? await supabase.from("categories").update(payload).eq("id", own.id)
    : await supabase.from("categories").insert({
        farm_id: farmId,
        entity,
        code,
        is_global: false,
        created_by: user.id,
        ...payload,
      });

  return error ? { error: "ক্যাটাগরি সংরক্ষণ করা যায়নি" } : {};
}

async function nextCategorySortOrder(supabase, farmId, entity) {
  const { data } = await supabase
    .from("categories")
    .select("sort_order")
    .or(`farm_id.eq.${farmId},farm_id.is.null`)
    .eq("entity", entity)
    .is("deleted_at", null);

  return (data ?? []).reduce((max, row) => Math.max(max, row.sort_order ?? 0), 0) + 1;
}

export async function saveCategoryAction(_prevState, formData) {
  const farmId = text(formData, "farmId");
  const entity = entityFrom(formData);
  const originalCode = text(formData, "originalCode");
  const code = originalCode || text(formData, "code");

  if (!entity || !slugPattern.test(code)) {
    return { error: "কোড ছোট লাতিন অক্ষর, সংখ্যা ও _ দিয়ে লিখুন" };
  }

  const nameBn = text(formData, "nameBn");
  if (!nameBn) return { error: "নাম (বাংলা) দিন" };

  const { supabase, user, role, permissions } = await requireFarmAccess(farmId);
  if (!can(role, permissions, "can_manage_categories")) {
    return { error: "ক্যাটাগরি বদলানোর অনুমতি নেই" };
  }

  const existing =
    (await ownCategory(supabase, farmId, entity, code)) ||
    (await globalCategory(supabase, entity, code));

  const transactionType = text(formData, "transactionType");
  const patch = {
    name: text(formData, "name") || nameBn,
    name_bn: nameBn,
    icon: optionalText(formData, "icon"),
    color: optionalText(formData, "color"),
    transaction_type:
      entity === "transaction" && ["income", "expense"].includes(transactionType)
        ? transactionType
        : null,
    is_active: formData.get("isActive") === "on",
    sort_order:
      existing?.sort_order ?? (await nextCategorySortOrder(supabase, farmId, entity)),
  };

  const result = await writeCategory(supabase, farmId, user, entity, code, patch);
  if (result.error) return result;

  revalidateSettings(farmId);
  return { ok: true };
}

export async function archiveCategoryAction(formData) {
  const farmId = text(formData, "farmId");
  const entity = entityFrom(formData);
  const code = text(formData, "code");

  const { supabase, user, role, permissions } = await requireFarmAccess(farmId);
  if (!entity || !can(role, permissions, "can_manage_categories")) return;

  await writeCategory(supabase, farmId, user, entity, code, { is_active: false });
  revalidateSettings(farmId);
}

export async function moveCategoryAction(formData) {
  const farmId = text(formData, "farmId");
  const entity = entityFrom(formData);
  const code = text(formData, "code");
  const direction = text(formData, "direction");

  const { supabase, user, role, permissions } = await requireFarmAccess(farmId);
  if (!entity || !can(role, permissions, "can_manage_categories")) return;

  const { data } = await supabase
    .from("categories")
    .select("*")
    .or(`farm_id.eq.${farmId},farm_id.is.null`)
    .eq("entity", entity)
    .is("deleted_at", null);

  const rows = resolveDefinitions(data, farmId, "code").filter((row) => row.is_active);
  const index = rows.findIndex((row) => row.code === code);
  const neighbor = rows[index + (direction === "up" ? -1 : 1)];
  if (index < 0 || !neighbor) return;

  await writeCategory(supabase, farmId, user, entity, code, {
    sort_order: neighbor.sort_order,
  });
  await writeCategory(supabase, farmId, user, entity, neighbor.code, {
    sort_order: rows[index].sort_order,
  });

  revalidateSettings(farmId);
}

// ---------------------------------------------------------------------------
// Custom fields
// ---------------------------------------------------------------------------

async function ownField(supabase, farmId, entity, key) {
  // Keys are only unique within an entity; scope every lookup accordingly.
  const { data } = await supabase
    .from("field_definitions")
    .select("*")
    .eq("farm_id", farmId)
    .eq("entity", entity)
    .eq("key", key)
    .maybeSingle();
  return data ?? null;
}

async function globalField(supabase, entity, key) {
  const { data } = await supabase
    .from("field_definitions")
    .select("*")
    .is("farm_id", null)
    .eq("entity", entity)
    .eq("key", key)
    .maybeSingle();
  return data ?? null;
}

async function writeField(supabase, farmId, entity, key, patch) {
  const own = await ownField(supabase, farmId, entity, key);
  const base = own ?? (await globalField(supabase, entity, key));
  if (!base && !patch.label_bn) {
    return { error: "ঘরটি খুঁজে পাওয়া যায়নি" };
  }

  const payload = base
    ? {
        label: base.label,
        label_bn: base.label_bn,
        type: base.type,
        options: base.options,
        required: base.required,
        default_value: base.default_value,
        sort_order: base.sort_order,
        show_in_list: base.show_in_list,
        show_in_form: base.show_in_form,
        is_active: base.is_active,
        ...patch,
      }
    : { ...patch };

  const { error } = own
    ? await supabase.from("field_definitions").update(payload).eq("id", own.id)
    : await supabase
        .from("field_definitions")
        .insert({ farm_id: farmId, entity, key, ...payload });

  return error ? { error: "ঘরটি সংরক্ষণ করা যায়নি" } : {};
}

function parseOptions(formData) {
  const raw = text(formData, "options");
  if (!raw) return [];

  return [...new Set(raw.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
}

export async function saveFieldAction(_prevState, formData) {
  const farmId = text(formData, "farmId");
  const entity = entityFrom(formData);
  const originalKey = text(formData, "originalKey");
  const key = originalKey || text(formData, "key");

  if (!entity || !slugPattern.test(key)) {
    return { error: "কী ছোট লাতিন অক্ষর, সংখ্যা ও _ দিয়ে লিখুন" };
  }

  const labelBn = text(formData, "labelBn");
  if (!labelBn) return { error: "ঘরের নাম (বাংলা) দিন" };

  const type = text(formData, "type");
  if (!FIELD_TYPES.some((item) => item.value === type)) {
    return { error: "ঘরের ধরন নির্বাচন করুন" };
  }

  const { supabase, role, permissions } = await requireFarmAccess(farmId);
  if (!can(role, permissions, "can_manage_fields")) {
    return { error: "অতিরিক্ত ঘর বদলানোর অনুমতি নেই" };
  }

  const existing =
    (await ownField(supabase, farmId, entity, key)) ||
    (await globalField(supabase, entity, key));

  // The cap counts resolved definitions (global + farm overrides), so it also
  // holds when a farm has not yet copied all of its global templates.
  const { data: allRows } = await supabase
    .from("field_definitions")
    .select("farm_id, key, sort_order")
    .or(`farm_id.eq.${farmId},farm_id.is.null`)
    .eq("entity", entity);

  const resolved = resolveDefinitions(allRows, farmId);
  if (!existing && resolved.length >= MAX_FIELDS_PER_ENTITY) {
    return {
      error: `একই বিভাগে সর্বোচ্চ ${MAX_FIELDS_PER_ENTITY} টি অতিরিক্ত ঘর রাখা যাবে`,
    };
  }

  const maxSortOrder = resolved.reduce(
    (max, row) => Math.max(max, row.sort_order ?? 0),
    0
  );

  const patch = {
    label: text(formData, "label") || labelBn,
    label_bn: labelBn,
    type,
    options: ["select", "multiselect"].includes(type) ? parseOptions(formData) : [],
    required: formData.get("required") === "on",
    default_value: optionalText(formData, "defaultValue"),
    is_active: formData.get("isActive") === "on",
    show_in_list: formData.get("showInList") === "on",
    show_in_form: formData.get("showInForm") === "on",
    sort_order: existing?.sort_order ?? maxSortOrder + 1,
  };

  const result = await writeField(supabase, farmId, entity, key, patch);
  if (result.error) return result;

  revalidateSettings(farmId);
  return { ok: true };
}

export async function archiveFieldAction(formData) {
  const farmId = text(formData, "farmId");
  const entity = entityFrom(formData);
  const key = text(formData, "key");

  const { supabase, role, permissions } = await requireFarmAccess(farmId);
  if (!entity || !can(role, permissions, "can_manage_fields")) return;

  await writeField(supabase, farmId, entity, key, { is_active: false });
  revalidateSettings(farmId);
}

export async function moveFieldAction(formData) {
  const farmId = text(formData, "farmId");
  const entity = entityFrom(formData);
  const key = text(formData, "key");
  const direction = text(formData, "direction");

  const { supabase, role, permissions } = await requireFarmAccess(farmId);
  if (!entity || !can(role, permissions, "can_manage_fields")) return;

  const { data } = await supabase
    .from("field_definitions")
    .select("*")
    .or(`farm_id.eq.${farmId},farm_id.is.null`)
    .eq("entity", entity);

  const rows = resolveDefinitions(data, farmId).filter((row) => row.is_active);
  const index = rows.findIndex((row) => row.key === key);
  const neighbor = rows[index + (direction === "up" ? -1 : 1)];
  if (index < 0 || !neighbor) return;

  await writeField(supabase, farmId, entity, key, {
    sort_order: neighbor.sort_order,
  });
  await writeField(supabase, farmId, entity, neighbor.key, {
    sort_order: rows[index].sort_order,
  });

  revalidateSettings(farmId);
}
