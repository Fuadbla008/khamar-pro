"use server";

import "server-only";

import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { getCategoryLabels } from "@/lib/categories/labels";
import { GENDER_LABELS, STATUS_LABELS } from "@/lib/animals/constants";
import {
  dueWindowDates,
  HEALTH_TABS,
  HEALTH_TYPE_LABELS,
} from "@/lib/health/constants";
import { ROLE_LABELS } from "@/lib/members/constants";
import {
  aggregateAnimalWise,
  aggregateCategoryWise,
  aggregateDetail,
  aggregateSummary,
  aggregateUserWise,
} from "@/lib/reports/aggregate";
import { loadReportData } from "@/lib/reports/query";
import {
  PRODUCTION_TABS,
  PRODUCTION_TYPE_LABELS,
} from "@/lib/production/constants";
import { TYPE_LABELS } from "@/lib/transactions/constants";
import {
  decimalToCents,
  multiplyDecimal,
  sumDecimal,
} from "@/lib/utils/decimal";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// A UUID that can never match a row: lets a filtered query keep its shape while
// returning zero rows (used when a member has no own records for an entity).
const EMPTY_ID = "00000000-0000-0000-0000-000000000000";

function filtersOf(filters) {
  return filters && typeof filters === "object" ? filters : {};
}

function allData(filters) {
  return Boolean(filters?.allData);
}

function activeFilter(filters, key) {
  if (allData(filters)) return null;
  const value = filters?.[key];
  if (!value || value === "all") return null;
  return String(value);
}

function dateFilter(filters, key) {
  if (allData(filters)) return null;
  const value = filters?.[key];
  return ISO_DATE.test(String(value ?? "")) ? String(value) : null;
}

function safeLike(value) {
  return String(value ?? "")
    .replace(/[,()\\]/g, " ")
    .trim()
    .slice(0, 80);
}

async function customColumns(supabase, farmId, entity) {
  const { data } = await supabase
    .from("field_definitions")
    .select("key, label_bn, label")
    .or(`farm_id.eq.${farmId},farm_id.is.null`)
    .eq("entity", entity)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (data ?? []).map((field) => ({
    key: `cf_${field.key}`,
    label: field.label_bn ?? field.label ?? field.key,
    format: "text",
  }));
}

function customRow(row) {
  const values = {};
  const fields = row?.custom_fields ?? {};
  if (typeof fields !== "object" || Array.isArray(fields)) return values;

  for (const [key, value] of Object.entries(fields)) {
    values[`cf_${key}`] = Array.isArray(value) ? value.join(", ") : value;
  }
  return values;
}

async function animalTags(supabase, farmId) {
  const { data } = await supabase
    .from("animals")
    .select("id, tag_no")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  return new Map((data ?? []).map((animal) => [animal.id, animal.tag_no]));
}

async function memberNames(supabase, farmId) {
  const { data } = await supabase
    .from("farm_members")
    .select("user_id, profiles(full_name)")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  return new Map(
    (data ?? []).map((member) => [
      member.user_id,
      member.profiles?.full_name || "সদস্য",
    ])
  );
}

function numberOrZero(value) {
  return Number(value ?? 0);
}

function throwIfError(error, message) {
  if (error) throw new Error(message);
}

// ---------------------------------------------------------------------------
// Entity exports
// ---------------------------------------------------------------------------

export async function buildAnimalsExport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const f = filtersOf(filters);

  let query = supabase
    .from("animals")
    .select("*")
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .order("tag_no", { ascending: true });

  const category = activeFilter(f, "category");
  const status = activeFilter(f, "status");
  const search = allData(f) ? "" : String(f.q ?? "").trim();
  // Bundle exports pass an explicit id allow-list (e.g. animals linked to the
  // member's own paid transactions). Unlike activeFilter() it survives allData.
  const ids = Array.isArray(f.ids) ? f.ids.map(String) : null;

  if (ids) query = query.in("id", ids.length ? ids : [EMPTY_ID]);
  if (category) query = query.eq("category_code", category);
  if (status) query = query.eq("status", status);
  if (search) {
    const term = safeLike(search);
    query = query.or(`tag_no.ilike.%${term}%,name.ilike.%${term}%`);
  }

  const { data, error } = await query;
  throwIfError(error, "পশু রপ্তানি করা যায়নি");
  const labels = await getCategoryLabels(supabase, farmId, "animal");
  const fields = await customColumns(supabase, farmId, "animal");

  return {
    columns: [
      { key: "tag_no", label: "ট্যাগ", format: "text" },
      { key: "name", label: "নাম", format: "text" },
      { key: "category", label: "ধরন", format: "text" },
      { key: "gender", label: "লিঙ্গ", format: "text" },
      { key: "status", label: "অবস্থা", format: "text" },
      { key: "dob", label: "জন্ম তারিখ", format: "date" },
      { key: "purchase_date", label: "ক্রয় তারিখ", format: "date" },
      { key: "purchase_price", label: "ক্রয় মূল্য (৳)", format: "money" },
      ...fields,
    ],
    rows: (data ?? []).map((row) => ({
      tag_no: row.tag_no,
      name: row.name ?? "",
      category: labels.get(row.category_code) ?? row.category_code,
      gender: GENDER_LABELS[row.gender] ?? "",
      status: STATUS_LABELS[row.status] ?? row.status,
      dob: row.dob,
      purchase_date: row.purchase_date,
      purchase_price: row.purchase_price ?? "",
      ...customRow(row),
    })),
  };
}

export async function buildTransactionsExport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const f = filtersOf(filters);

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const from = dateFilter(f, "from");
  const to = dateFilter(f, "to");
  const type = activeFilter(f, "type");
  const category = activeFilter(f, "category");
  const paidBy = activeFilter(f, "paidBy");
  // ownerId is the role-scope filter used by bundle exports and is intentionally
  // not cleared by allData (a member may export all of their own records).
  const ownerId = String(f.ownerId ?? "").trim();

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (type) query = query.eq("type", type);
  if (category) query = query.eq("category_code", category);
  if (paidBy === "none") query = query.is("paid_by", null);
  else if (paidBy) query = query.eq("paid_by", paidBy);
  if (ownerId) query = query.eq("paid_by", ownerId);

  const { data, error } = await query;
  throwIfError(error, "লেনদেন রপ্তানি করা যায়নি");

  const [labels, tags, names, fields] = await Promise.all([
    getCategoryLabels(supabase, farmId, "transaction"),
    animalTags(supabase, farmId),
    memberNames(supabase, farmId),
    customColumns(supabase, farmId, "transaction"),
  ]);

  return {
    columns: [
      { key: "date", label: "তারিখ", format: "date" },
      { key: "type", label: "ধরন", format: "text" },
      { key: "category", label: "ক্যাটাগরি", format: "text" },
      { key: "amount", label: "অর্থ (৳)", format: "money" },
      { key: "paid_by", label: "সদস্য", format: "text" },
      { key: "animal", label: "পশু", format: "text" },
      { key: "note", label: "নোট", format: "text" },
      ...fields,
    ],
    rows: (data ?? []).map((row) => ({
      date: row.date,
      type: TYPE_LABELS[row.type] ?? row.type,
      category: labels.get(row.category_code) ?? row.category_code,
      amount: row.amount,
      paid_by: row.paid_by ? names.get(row.paid_by) ?? "সদস্য" : "",
      animal: row.animal_id ? tags.get(row.animal_id) ?? "" : "",
      note: row.note ?? "",
      ...customRow(row),
    })),
  };
}

export async function buildInventoryExport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const f = filtersOf(filters);

  let query = supabase
    .from("inventory_items")
    .select("*")
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .order("category_code", { ascending: true })
    .order("name_bn", { ascending: true });

  const category = activeFilter(f, "category");
  if (category) query = query.eq("category_code", category);
  // Inventory rows have no created_by column, so a member-scoped bundle keeps
  // the standard headings but exports no inventory rows.
  if (f.forceEmpty) query = query.eq("id", EMPTY_ID);

  const { data, error } = await query;
  throwIfError(error, "ইনভেন্টরি রপ্তানি করা যায়নি");

  const [labels, fields] = await Promise.all([
    getCategoryLabels(supabase, farmId, "inventory"),
    customColumns(supabase, farmId, "inventory"),
  ]);

  return {
    columns: [
      { key: "name", label: "নাম", format: "text" },
      { key: "category", label: "ক্যাটাগরি", format: "text" },
      { key: "unit", label: "একক", format: "text" },
      { key: "current_stock", label: "বর্তমান স্টক", format: "number" },
      { key: "min_stock", label: "ন্যুনতম স্টক", format: "number" },
      { key: "unit_price", label: "একক মূল্য (৳)", format: "money" },
      { key: "total_value", label: "মোট মূল্য (৳)", format: "money" },
      ...fields,
    ],
    rows: (data ?? []).map((row) => ({
      name: row.name_bn,
      category: labels.get(row.category_code) ?? row.category_code,
      unit: row.unit,
      current_stock: row.current_stock,
      min_stock: row.min_stock,
      unit_price: row.unit_price ?? "",
      total_value: multiplyDecimal(
        row.current_stock ?? 0,
        row.unit_price ?? 0
      ),
      ...customRow(row),
    })),
  };
}

export async function buildHealthExport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const f = filtersOf(filters);

  let query = supabase
    .from("health_records")
    .select("*")
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const tab = allData(f) ? "all" : String(f.tab ?? "all");
  const healthTypes =
    HEALTH_TABS.find((item) => item.value === tab)?.types ?? null;
  const createdBy = String(f.createdBy ?? "").trim();
  const from = dateFilter(f, "from");
  const to = dateFilter(f, "to");

  if (healthTypes) query = query.in("type", healthTypes);
  if (createdBy) query = query.eq("created_by", createdBy);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  if (!allData(f) && f.filter === "due") {
    const window = dueWindowDates();
    query = query
      .gte("next_due_date", window.start)
      .lte("next_due_date", window.end);
  }

  const { data, error } = await query;
  throwIfError(error, "স্বাস্থ্য রেকর্ড রপ্তানি করা যায়নি");

  const [tags, medicines, fields] = await Promise.all([
    animalTags(supabase, farmId),
    (async () => {
      const { data: items } = await supabase
        .from("inventory_items")
        .select("id, name_bn")
        .eq("farm_id", farmId)
        .is("deleted_at", null);
      return new Map((items ?? []).map((item) => [item.id, item.name_bn]));
    })(),
    customColumns(supabase, farmId, "health"),
  ]);

  return {
    columns: [
      { key: "date", label: "তারিখ", format: "date" },
      { key: "animal", label: "পশু", format: "text" },
      { key: "type", label: "ধরন", format: "text" },
      { key: "title", label: "শিরোনাম", format: "text" },
      { key: "medicine", label: "ঔষধ", format: "text" },
      { key: "dosage", label: "মাত্রা", format: "text" },
      { key: "next_due_date", label: "পরবর্তী তারিখ", format: "date" },
      { key: "cost", label: "খরচ (৳)", format: "money" },
      { key: "status", label: "অবস্থা", format: "text" },
      { key: "notes", label: "নোট", format: "text" },
      ...fields,
    ],
    rows: (data ?? []).map((row) => ({
      date: row.date,
      animal: row.animal_id ? tags.get(row.animal_id) ?? "" : "পুরো দল",
      type: HEALTH_TYPE_LABELS[row.type] ?? row.type,
      title: row.title,
      medicine: row.medicine_item_id
        ? medicines.get(row.medicine_item_id) ?? ""
        : "",
      dosage: row.dosage ?? "",
      next_due_date: row.next_due_date ?? "",
      cost: row.cost ?? 0,
      status: row.is_done ? "সম্পন্ন" : "বাকি",
      notes: row.notes ?? "",
      ...customRow(row),
    })),
  };
}

export async function buildProductionExport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const f = filtersOf(filters);

  let query = supabase
    .from("production_records")
    .select("*")
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const tab = allData(f) ? "all" : String(f.type ?? f.tab ?? "all");
  const types = PRODUCTION_TABS.find((item) => item.value === tab)?.types ?? null;
  const createdBy = String(f.createdBy ?? "").trim();

  if (types) query = query.in("type", types);
  if (createdBy) query = query.eq("created_by", createdBy);

  const from = dateFilter(f, "from");
  const to = dateFilter(f, "to");
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  throwIfError(error, "উৎপাদন রপ্তানি করা যায়নি");

  const [tags, fields] = await Promise.all([
    animalTags(supabase, farmId),
    customColumns(supabase, farmId, "production"),
  ]);

  return {
    columns: [
      { key: "date", label: "তারিখ", format: "date" },
      { key: "type", label: "ধরন", format: "text" },
      { key: "animal", label: "পশু", format: "text" },
      { key: "qty", label: "পরিমাণ", format: "number" },
      { key: "unit", label: "একক", format: "text" },
      { key: "price_per_unit", label: "একক মূল্য (৳)", format: "money" },
      { key: "total_income", label: "মোট আয় (৳)", format: "money" },
      { key: "source", label: "লেনদেন", format: "text" },
      { key: "notes", label: "নোট", format: "text" },
      ...fields,
    ],
    rows: (data ?? []).map((row) => ({
      date: row.date,
      type: PRODUCTION_TYPE_LABELS[row.type] ?? row.type,
      animal: row.animal_id ? tags.get(row.animal_id) ?? "" : "পুরো দল",
      qty: row.qty,
      unit: row.unit,
      price_per_unit: row.price_per_unit ?? 0,
      total_income: row.total_income ?? 0,
      source: row.linked_transaction_id ? "সংযুক্ত আয়" : "",
      notes: row.notes ?? "",
      ...customRow(row),
    })),
  };
}

export async function buildMembersExport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const memberId = String(filtersOf(filters).memberId ?? "").trim();

  let membersQuery = supabase
    .from("farm_members")
    .select("user_id, role, permissions, joined_at, profiles(full_name, phone)")
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .order("joined_at", { ascending: true });
  if (memberId) membersQuery = membersQuery.eq("user_id", memberId);

  const [membersResult, expensesResult] = await Promise.all([
    membersQuery,
    supabase
      .from("transactions")
      .select("paid_by")
      .eq("farm_id", farmId)
      .eq("type", "expense")
      .is("deleted_at", null),
  ]);

  throwIfError(membersResult.error, "সদস্য রপ্তানি করা যায়নি");

  const expenseCounts = {};
  for (const row of expensesResult.data ?? []) {
    if (!row.paid_by) continue;
    expenseCounts[row.paid_by] = (expenseCounts[row.paid_by] ?? 0) + 1;
  }

  return {
    columns: [
      { key: "name", label: "নাম", format: "text" },
      { key: "phone", label: "ফোন", format: "text" },
      { key: "role", label: "ভূমিকা", format: "text" },
      { key: "joined_at", label: "যোগদান", format: "date" },
      { key: "expense_count", label: "খরচ এন্ট্রি", format: "number" },
      { key: "can_manage_members", label: "সদস্য ব্যবস্থাপনা", format: "boolean" },
    ],
    rows: (membersResult.data ?? []).map((row) => ({
      name: row.profiles?.full_name || "সদস্য",
      phone: row.profiles?.phone ?? "",
      role: ROLE_LABELS[row.role] ?? row.role,
      joined_at: row.joined_at,
      expense_count: expenseCounts[row.user_id] ?? 0,
      can_manage_members: Boolean(row.permissions?.can_manage_members),
    })),
  };
}

export async function buildFarmSummaryExport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const f = filtersOf(filters);
  const from = dateFilter(f, "from");
  const to = dateFilter(f, "to");

  const farmQuery = supabase
    .from("farms")
    .select("name")
    .eq("id", farmId)
    .is("deleted_at", null)
    .maybeSingle();

  const animalsQuery = supabase
    .from("animals")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .is("deleted_at", null);

  let transactionQuery = supabase
    .from("transactions")
    .select("type, amount")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  if (from) transactionQuery = transactionQuery.gte("date", from);
  if (to) transactionQuery = transactionQuery.lte("date", to);

  const inventoryQuery = supabase
    .from("inventory_items")
    .select("current_stock, min_stock, unit_price")
    .eq("farm_id", farmId)
    .is("deleted_at", null);

  const healthQuery = supabase
    .from("health_records")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .is("deleted_at", null);

  const window = dueWindowDates();
  const dueQuery = supabase
    .from("health_records")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .gte("next_due_date", window.start)
    .lte("next_due_date", window.end);

  let productionQuery = supabase
    .from("production_records")
    .select("total_income")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  if (from) productionQuery = productionQuery.gte("date", from);
  if (to) productionQuery = productionQuery.lte("date", to);

  const [
    farmResult,
    animalsResult,
    transactionsResult,
    inventoryResult,
    healthResult,
    dueResult,
    productionResult,
  ] = await Promise.all([
    farmQuery,
    animalsQuery,
    transactionQuery,
    inventoryQuery,
    healthQuery,
    dueQuery,
    productionQuery,
  ]);

  const transactions = transactionsResult.data ?? [];
  const inventory = inventoryResult.data ?? [];
  const income = sumDecimal(
    transactions.filter((row) => row.type === "income").map((row) => row.amount)
  );
  const expense = sumDecimal(
    transactions.filter((row) => row.type === "expense").map((row) => row.amount)
  );
  const net = centsToDecimalSigned(income, expense);
  const inventoryValue = sumDecimal(
    inventory.map((row) => multiplyDecimal(row.current_stock ?? 0, row.unit_price ?? 0))
  );
  const lowStock = inventory.filter(
    (row) =>
      numberOrZero(row.current_stock) <= numberOrZero(row.min_stock)
  ).length;

  return {
    columns: [
      { key: "metric", label: "বিবরণ", format: "text" },
      { key: "value", label: "মান", format: "text" },
    ],
    rows: [
      { metric: "খামার", value: farmResult.data?.name ?? "" },
      {
        metric: "সময়সীমা",
        value: from || to ? `${from || "শুরু"} — ${to || "আজ"}` : "সব তারিখ",
      },
      { metric: "মোট পশু", value: animalsResult.count ?? 0 },
      { metric: "মোট আয় (৳)", value: income },
      { metric: "মোট খরচ (৳)", value: expense },
      { metric: "নিট লাভ/ক্ষতি (৳)", value: net },
      { metric: "ইনভেন্টরি মূল্য (৳)", value: inventoryValue },
      { metric: "কম স্টক আইটেম", value: lowStock },
      { metric: "স্বাস্থ্য রেকর্ড", value: healthResult.count ?? 0 },
      { metric: "আসন্ন টিকা", value: dueResult.count ?? 0 },
      { metric: "উৎপাদন এন্ট্রি", value: productionResult.data?.length ?? 0 },
      {
        metric: "উৎপাদন আয় (৳)",
        value: sumDecimal((productionResult.data ?? []).map((row) => row.total_income)),
      },
    ],
  };
}

function centsToDecimalSigned(income, expense) {
  const cents = decimalToCents(income) - decimalToCents(expense);
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const text = `${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
  return negative ? `-${text}` : text;
}

export async function buildUserWiseExport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const f = filtersOf(filters);
  const from = dateFilter(f, "from");
  const to = dateFilter(f, "to");

  let transactionQuery = supabase
    .from("transactions")
    .select("paid_by, type, amount")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  if (from) transactionQuery = transactionQuery.gte("date", from);
  if (to) transactionQuery = transactionQuery.lte("date", to);

  const [membersResult, transactionsResult] = await Promise.all([
    supabase
      .from("farm_members")
      .select("user_id, role, profiles(full_name)")
      .eq("farm_id", farmId)
      .is("deleted_at", null)
      .order("joined_at", { ascending: true }),
    transactionQuery,
  ]);

  throwIfError(membersResult.error, "সদস্য রপ্তানি করা যায়নি");

  const groups = new Map();
  const ensureGroup = (userId, name, role) => {
    if (!groups.has(userId ?? "none")) {
      groups.set(userId ?? "none", {
        user: name,
        role,
        count: 0,
        income: [],
        expense: [],
      });
    }
    return groups.get(userId ?? "none");
  };

  for (const member of membersResult.data ?? []) {
    ensureGroup(
      member.user_id,
      member.profiles?.full_name || "সদস্য",
      ROLE_LABELS[member.role] ?? member.role
    );
  }

  // System-generated expenses (animal purchases, production costs) have no
  // paid_by. Without this bucket they are silently dropped from the export.
  ensureGroup(null, "সদস্য নেই", "—");

  for (const row of transactionsResult.data ?? []) {
    const group = groups.get(row.paid_by ?? "none");
    if (!group) continue;
    group.count += 1;
    if (row.type === "income") group.income.push(row.amount);
    else group.expense.push(row.amount);
  }

  return {
    columns: [
      { key: "user", label: "সদস্য", format: "text" },
      { key: "role", label: "ভূমিকা", format: "text" },
      { key: "count", label: "লেনদেন", format: "number" },
      { key: "income", label: "আয় (৳)", format: "money" },
      { key: "expense", label: "খরচ (৳)", format: "money" },
      { key: "net", label: "নিট (৳)", format: "money" },
    ],
    rows: [...groups.values()].map((group) => {
      const income = sumDecimal(group.income);
      const expense = sumDecimal(group.expense);
      return {
        user: group.user,
        role: group.role,
        count: group.count,
        income,
        expense,
        net: centsToDecimalSigned(income, expense),
      };
    }),
  };
}

export async function buildCategoryWiseExport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const f = filtersOf(filters);
  const from = dateFilter(f, "from");
  const to = dateFilter(f, "to");

  let query = supabase
    .from("transactions")
    .select("type, category_code, amount")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  throwIfError(error, "ক্যাটাগরি রপ্তানি করা যায়নি");
  const labels = await getCategoryLabels(supabase, farmId, "transaction");

  const groups = new Map();
  for (const row of data ?? []) {
    const key = `${row.type}:${row.category_code}`;
    if (!groups.has(key)) {
      groups.set(key, {
        category: labels.get(row.category_code) ?? row.category_code,
        type: TYPE_LABELS[row.type] ?? row.type,
        count: 0,
        amounts: [],
      });
    }
    const group = groups.get(key);
    group.count += 1;
    group.amounts.push(row.amount);
  }

  return {
    columns: [
      { key: "category", label: "ক্যাটাগরি", format: "text" },
      { key: "type", label: "ধরন", format: "text" },
      { key: "count", label: "লেনদেন", format: "number" },
      { key: "total", label: "মোট অর্থ (৳)", format: "money" },
    ],
    rows: [...groups.values()].map((group) => ({
      category: group.category,
      type: group.type,
      count: group.count,
      total: sumDecimal(group.amounts),
    })),
  };
}

// ---------------------------------------------------------------------------
// Reports exports. These mirror the visible report tabs exactly; the UI also
// passes its loaded rows directly to <ExportButton /> for the "current" mode.
// ---------------------------------------------------------------------------

async function reportData(farmId, filters) {
  const { supabase } = await requireFarmAccess(farmId);
  return loadReportData(supabase, farmId, filters);
}

export async function buildReportSummaryExport(farmId, filters = {}) {
  const data = await reportData(farmId, filters);
  const summary = aggregateSummary(data, data.filters);

  const rows = [
    { metric: "মোট আয় (৳)", value: summary.income },
    { metric: "মোট খরচ (৳)", value: summary.expense },
    { metric: "লাভ/ক্ষতি (৳)", value: summary.net },
    { metric: "লেনদেন সংখ্যা", value: summary.count },
  ];

  for (const month of summary.monthly) {
    rows.push({ metric: `মাসিক আয় — ${month.label}`, value: month.income });
    rows.push({ metric: `মাসিক খরচ — ${month.label}`, value: month.expense });
  }
  for (const category of summary.expenseByCategory) {
    rows.push({ metric: `খরচ ক্যাটাগরি — ${category.label}`, value: category.amount });
  }

  return {
    columns: [
      { key: "metric", label: "বিবরণ", format: "text" },
      { key: "value", label: "মান", format: "text" },
    ],
    rows,
  };
}

export async function buildReportUserWiseExport(farmId, filters = {}) {
  const data = await reportData(farmId, filters);
  const members = aggregateUserWise(data);
  return {
    columns: [
      { key: "name", label: "সদস্যের নাম", format: "text" },
      { key: "expenseCount", label: "মোট খরচ এন্ট্রি", format: "number" },
      { key: "incomeCount", label: "মোট আয় এন্ট্রি", format: "number" },
      { key: "expense", label: "কত টাকা খরচ (৳)", format: "money" },
      { key: "income", label: "কত টাকা আয় (৳)", format: "money" },
      { key: "balance", label: "ব্যালেন্স (৳)", format: "money" },
    ],
    rows: members,
  };
}

export async function buildReportAnimalWiseExport(farmId, filters = {}) {
  const data = await reportData(farmId, filters);
  const animals = aggregateAnimalWise(data);
  return {
    columns: [
      { key: "tagNo", label: "ট্যাগ নম্বর", format: "text" },
      { key: "name", label: "নাম", format: "text" },
      { key: "category", label: "ক্যাটাগরি", format: "text" },
      { key: "expense", label: "মোট খরচ (৳)", format: "money" },
      { key: "income", label: "মোট আয় (৳)", format: "money" },
      { key: "net", label: "লাভ/ক্ষতি (৳)", format: "money" },
    ],
    rows: animals,
  };
}

export async function buildReportCategoryWiseExport(farmId, filters = {}) {
  const data = await reportData(farmId, filters);
  const breakdown = aggregateCategoryWise(data);
  const rows = [
    ...breakdown.income.map((item) => ({
      type: "আয়",
      category: item.label,
      amount: item.amount,
      percent: item.percent,
    })),
    ...breakdown.expense.map((item) => ({
      type: "খরচ",
      category: item.label,
      amount: item.amount,
      percent: item.percent,
    })),
  ];
  return {
    columns: [
      { key: "type", label: "ধরন", format: "text" },
      { key: "category", label: "ক্যাটাগরি", format: "text" },
      { key: "amount", label: "অর্থ (৳)", format: "money" },
      { key: "percent", label: "শতাংশ", format: "number" },
    ],
    rows,
  };
}

export async function buildReportDetailExport(farmId, filters = {}) {
  const data = await reportData(farmId, filters);
  return {
    columns: [
      { key: "date", label: "তারিখ", format: "date" },
      { key: "typeLabel", label: "ধরন", format: "text" },
      { key: "category", label: "ক্যাটাগরি", format: "text" },
      { key: "paidBy", label: "সদস্য", format: "text" },
      { key: "animal", label: "পশু", format: "text" },
      { key: "amount", label: "অর্থ (৳)", format: "money" },
      { key: "note", label: "নোট", format: "text" },
    ],
    rows: aggregateDetail(data),
  };
}

// Single client entry point used by <ExportButton />.
export async function buildExport(farmId, entity, filters = {}) {
  switch (entity) {
    case "animals":
      return buildAnimalsExport(farmId, filters);
    case "transactions":
      return buildTransactionsExport(farmId, filters);
    case "inventory":
      return buildInventoryExport(farmId, filters);
    case "health":
      return buildHealthExport(farmId, filters);
    case "production":
      return buildProductionExport(farmId, filters);
    case "members":
      return buildMembersExport(farmId, filters);
    case "farm-summary":
      return buildFarmSummaryExport(farmId, filters);
    case "user-wise":
      return buildUserWiseExport(farmId, filters);
    case "category-wise":
      return buildCategoryWiseExport(farmId, filters);
    case "report-summary":
      return buildReportSummaryExport(farmId, filters);
    case "report-userwise":
      return buildReportUserWiseExport(farmId, filters);
    case "report-animalwise":
      return buildReportAnimalWiseExport(farmId, filters);
    case "report-categorywise":
      return buildReportCategoryWiseExport(farmId, filters);
    case "report-detail":
      return buildReportDetailExport(farmId, filters);
    default:
      return { columns: [], rows: [] };
  }
}
