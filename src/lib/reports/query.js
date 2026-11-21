import "server-only";

import { resolveDefinitions } from "@/lib/fields/resolve";
import { slugifyFarmName } from "@/lib/export/filename";
import { reportTab } from "@/lib/reports/constants";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== null && item !== undefined && item !== "").map(String);
  }
  if (typeof value === "string" && value) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function normalizeReportFilters(filters = {}) {
  const source = filters && typeof filters === "object" ? filters : {};
  const date = (value) => (ISO_DATE.test(String(value ?? "")) ? String(value) : null);

  return {
    from: date(source.from),
    to: date(source.to),
    paidBy: toArray(source.paidBy),
    categories: toArray(source.categories),
    animalIds: toArray(source.animalIds),
  };
}

function splitIds(values) {
  const ids = [];
  let includeNone = false;
  for (const value of values) {
    if (value === "none") includeNone = true;
    else ids.push(value);
  }
  return { ids, includeNone };
}

function applyNullableIn(query, column, values) {
  const { ids, includeNone } = splitIds(values);
  if (ids.length && includeNone) {
    return query.or(`${column}.in.(${ids.join(",")}),${column}.is.null`);
  }
  if (ids.length) return query.in(column, ids);
  if (includeNone) return query.is(column, null);
  return query;
}

// Every reports Server Action and report export goes through this helper, so
// the visible tab and its CSV are guaranteed to use identical filters. RLS on
// transactions/animals/farm_members (is_farm_member) still applies to the read.
export async function loadReportData(supabase, farmId, filters = {}) {
  const f = normalizeReportFilters(filters);

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (f.from) query = query.gte("date", f.from);
  if (f.to) query = query.lte("date", f.to);
  if (f.categories.length) query = query.in("category_code", f.categories);
  query = applyNullableIn(query, "paid_by", f.paidBy);
  query = applyNullableIn(query, "animal_id", f.animalIds);

  const [transactionsResult, categoryRows, animalRows, animalCategoryRows, memberRows] =
    await Promise.all([
      query,
      supabase
        .from("categories")
        .select("code, name_bn, transaction_type, sort_order, farm_id")
        .or(`farm_id.eq.${farmId},farm_id.is.null`)
        .eq("entity", "transaction")
        .is("deleted_at", null)
        .eq("is_active", true),
      supabase
        .from("animals")
        .select("id, tag_no, name, category_code, farm_id")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .order("tag_no", { ascending: true }),
      supabase
        .from("categories")
        .select("code, name_bn, sort_order, farm_id")
        .or(`farm_id.eq.${farmId},farm_id.is.null`)
        .eq("entity", "animal")
        .is("deleted_at", null)
        .eq("is_active", true),
      supabase
        .from("farm_members")
        .select("user_id, role, profiles(full_name)")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .order("joined_at", { ascending: true }),
    ]);

  if (transactionsResult.error) throw new Error("রিপোর্টের লেনদেন পড়া যায়নি");

  const categories = resolveDefinitions(categoryRows.data, farmId, "code");
  const categoryLabels = new Map(categories.map((row) => [row.code, row.name_bn ?? row.code]));
  const animals = animalRows.data ?? [];
  const animalMap = new Map(animals.map((row) => [row.id, row]));
  const animalCategoryLabels = new Map(
    resolveDefinitions(animalCategoryRows.data, farmId, "code").map((row) => [
      row.code,
      row.name_bn ?? row.code,
    ])
  );
  const memberNames = new Map(
    (memberRows.data ?? []).map((row) => [row.user_id, row.profiles?.full_name || "সদস্য"])
  );
  const memberRoles = new Map(
    (memberRows.data ?? []).map((row) => [row.user_id, row.role])
  );

  return {
    filters: f,
    transactions: transactionsResult.data ?? [],
    categories,
    categoryLabels,
    animals,
    animalMap,
    animalCategoryLabels,
    memberNames,
    memberRoles,
  };
}

// Filter options and farm identity for the page shell. Kept in one helper so
// the page never hardcodes categories, roles, or animal lists.
export async function loadReportContext(supabase, farmId) {
  const [farmResult, categoryRows, animalRows, animalCategoryRows, memberRows] =
    await Promise.all([
      supabase
        .from("farms")
        .select("name")
        .eq("id", farmId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("categories")
        .select("code, name_bn, transaction_type, sort_order, farm_id")
        .or(`farm_id.eq.${farmId},farm_id.is.null`)
        .eq("entity", "transaction")
        .is("deleted_at", null)
        .eq("is_active", true),
      supabase
        .from("animals")
        .select("id, tag_no, name, category_code")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .order("tag_no", { ascending: true }),
      supabase
        .from("categories")
        .select("code, name_bn, sort_order, farm_id")
        .or(`farm_id.eq.${farmId},farm_id.is.null`)
        .eq("entity", "animal")
        .is("deleted_at", null)
        .eq("is_active", true),
      supabase
        .from("farm_members")
        .select("user_id, role, profiles(full_name)")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .order("joined_at", { ascending: true }),
    ]);

  const farmName = farmResult.data?.name ?? "";
  const categories = resolveDefinitions(categoryRows.data, farmId, "code").map((row) => ({
    code: row.code,
    label: row.name_bn ?? row.code,
    type: row.transaction_type ?? null,
  }));
  const animalCategories = new Map(
    resolveDefinitions(animalCategoryRows.data, farmId, "code").map((row) => [
      row.code,
      row.name_bn ?? row.code,
    ])
  );

  return {
    farmName,
    farmSlug: slugifyFarmName(farmName, farmId),
    categories,
    members: (memberRows.data ?? []).map((row) => ({
      id: row.user_id,
      name: row.profiles?.full_name || "সদস্য",
      role: row.role,
    })),
    animals: (animalRows.data ?? []).map((row) => ({
      id: row.id,
      tagNo: row.tag_no,
      name: row.name ?? "",
      category: animalCategories.get(row.category_code) ?? row.category_code,
    })),
  };
}

// CSV builders call the same loader; the extra label is only for localised
// column headings.
export function reportLabel(tabValue) {
  return reportTab(tabValue).label;
}
