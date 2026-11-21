import "server-only";

import {
  buildAnimalsExport,
  buildHealthExport,
  buildInventoryExport,
  buildMembersExport,
  buildProductionExport,
  buildTransactionsExport,
} from "./builders";
import { toCSV } from "./csv";
import { slugifyFarmName } from "./filename";

// Shared, non-action helpers for the export centre. Server Actions in
// ./actions.js call requireFarmAccess() and hand the resulting Supabase client,
// user and role here. Nothing in this module is a "use server" export.

const EMPTY_ID = "00000000-0000-0000-0000-000000000000";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const ENTITY_LABELS = {
  animals: "পশু",
  transactions: "লেনদেন",
  inventory: "ইনভেন্টরি",
  health: "স্বাস্থ্য রেকর্ড",
  production: "উৎপাদন",
  members: "সদস্য",
};

const EXPORT_ENTITIES = Object.keys(ENTITY_LABELS);

const CUSTOM_ENTITY_TABLES = [
  ["animal", "animals"],
  ["transaction", "transactions"],
  ["inventory", "inventory_items"],
  ["health", "health_records"],
  ["production", "production_records"],
];

const ROW_ERRORS = {
  animals: "পশু ডেটা পড়া যায়নি",
  transactions: "লেনদেন ডেটা পড়া যায়নি",
  inventory_items: "ইনভেন্টরি ডেটা পড়া যায়নি",
  inventory_movements: "ইনভেন্টরি গতিবিধি পড়া যায়নি",
  health_records: "স্বাস্থ্য রেকর্ড পড়া যায়নি",
  production_records: "উৎপাদন রেকর্ড পড়া যায়নি",
  members: "সদস্য ডেটা পড়া যায়নি",
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function todayString() {
  const now = new Date();
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

function dateString(value) {
  const text = String(value ?? "").trim();
  const match = ISO_DATE.exec(text);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return text || "—";
}

// Server Actions must return plain serializable values: no Dates, Maps, Sets
// or undefined anywhere in the payload.
function plain(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(plain);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, plain(item)])
    );
  }
  return value;
}

function throwIfError(error, message) {
  if (error) throw new Error(message);
}

function canExportAll(role) {
  return role === "owner" || role === "manager";
}

function normalizeOptions(options) {
  const source = options && typeof options === "object" ? options : {};
  const date = (value) =>
    ISO_DATE.test(String(value ?? "")) ? String(value) : "";
  const from = date(source.from);
  const to = date(source.to);
  if (from && to && from > to) {
    throw new Error("শুরুর তারিখ শেষের তারিখের পরে হতে পারবে না");
  }

  const requested = Array.isArray(source.entities)
    ? source.entities.map(String)
    : EXPORT_ENTITIES;
  const entities = requested.filter((entity) => ENTITY_LABELS[entity]);
  const section =
    source.section === "date" || source.section === "member"
      ? source.section
      : "full";

  return {
    section,
    from,
    to,
    allData: Boolean(source.allData) || (!from && !to),
    entities: entities.length ? entities : EXPORT_ENTITIES,
  };
}

function filterDescription(section, options, scope) {
  const label = {
    full: "সম্পূর্ণ খামার ডেটা",
    date: "ডেট ভিত্তিক এক্সপোর্ট",
    member: "সদস্য ভিত্তিক এক্সপোর্ট",
    backup: "ব্যাকআপ JSON",
  }[section] ?? section;

  const parts = [label];
  parts.push(
    options.allData
      ? "সব তারিখ"
      : `${dateString(options.from) || "শুরু"} — ${dateString(options.to) || "আজ"}`
  );
  if (options.section === "date" || options.section === "full") {
    parts.push(
      `ধরন: ${options.entities.map((entity) => ENTITY_LABELS[entity]).join(" + ")}`
    );
  }
  parts.push(
    scope.targetUserId
      ? `সদস্য: ${String(scope.memberName ?? "নির্বাচিত সদস্য").replace(/,/g, "")}`
      : "সব সদস্য"
  );
  if (!scope.exportAll) parts.push("শুধু নিজের রেকর্ড");
  return parts.join("; ");
}

function metaRow(farmName, exportedAt, description) {
  return `# খামার: ${farmName} | ব্যাকআপ তারিখ: ${exportedAt} | ফিল্টার: ${description}`;
}

function zipFileName(prefix, farmSlug, options) {
  const range =
    options.from || options.to
      ? `${options.from ? options.from.replaceAll("-", "") : "start"}_${
          options.to ? options.to.replaceAll("-", "") : "today"
        }`
      : "all";
  return `${prefix}_${farmSlug}_${range}.zip`;
}

async function loadFarm(supabase, farmId) {
  const { data, error } = await supabase
    .from("farms")
    .select("id, name, primary_type, address, currency, created_at")
    .eq("id", farmId)
    .is("deleted_at", null)
    .maybeSingle();
  throwIfError(error, "খামারের তথ্য পড়া যায়নি");
  if (!data) throw new Error("খামার পাওয়া যায়নি");
  return plain(data);
}

async function loadMembers(supabase, farmId) {
  const { data, error } = await supabase
    .from("farm_members")
    .select("user_id, role, permissions, joined_at, profiles(full_name, phone)")
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .order("joined_at", { ascending: true });
  throwIfError(error, "সদস্য তালিকা পড়া যায়নি");

  return (data ?? []).map((row) => ({
    id: row.user_id,
    name: row.profiles?.full_name || "সদস্য",
    phone: row.profiles?.phone ?? "",
    role: row.role,
    permissions: plain(row.permissions ?? {}),
    joined_at: row.joined_at ?? null,
  }));
}

async function loadSelfAnimalIds(supabase, farmId, userId, options = {}) {
  let query = supabase
    .from("transactions")
    .select("animal_id")
    .eq("farm_id", farmId)
    .eq("paid_by", userId)
    .is("deleted_at", null);
  if (options.section === "date" && !options.allData) {
    if (options.from) query = query.gte("date", options.from);
    if (options.to) query = query.lte("date", options.to);
  }

  const { data, error } = await query;
  throwIfError(error, "নিজের লেনদেন পড়া যায়নি");

  const ids = new Set();
  for (const row of data ?? []) {
    if (row.animal_id) ids.add(row.animal_id);
  }
  return [...ids];
}

async function resolveScope(
  supabase,
  farmId,
  context,
  requestedMemberId,
  options = {}
) {
  const { user, role } = context;

  if (!canExportAll(role)) {
    const members = await loadMembers(supabase, farmId);
    const self = members.find((member) => member.id === user.id);
    return {
      exportAll: false,
      targetUserId: user.id,
      memberName: self?.name ?? "আপনি",
      animalIds: await loadSelfAnimalIds(supabase, farmId, user.id, options),
    };
  }

  if (!requestedMemberId) {
    return {
      exportAll: true,
      targetUserId: null,
      memberName: "সব সদস্য",
      animalIds: null,
    };
  }

  const members = await loadMembers(supabase, farmId);
  const target = members.find((member) => member.id === requestedMemberId);
  if (!target) throw new Error("নির্বাচিত সদস্য এই খামারের সদস্য নন");
  return {
    exportAll: true,
    targetUserId: target.id,
    memberName: target.name,
    animalIds: await loadSelfAnimalIds(supabase, farmId, target.id, options),
  };
}

// Page shell data. The page itself calls requireFarmAccess(); this helper only
// reads the extra member list needed to render the "সদস্য ভিত্তিক" selector.
export async function loadExportContext(supabase, farmId, user, role) {
  const [farm, members] = await Promise.all([
    loadFarm(supabase, farmId),
    loadMembers(supabase, farmId),
  ]);
  const self =
    members.find((member) => member.id === user.id) ?? {
      id: user.id,
      name: "আপনি",
      role,
    };

  return {
    farmSlug: slugifyFarmName(farm.name, farmId),
    canSelectMember: canExportAll(role),
    members: canExportAll(role) ? members.map(plain) : [],
    self: plain(self),
  };
}

function scopedFilters(scope, options) {
  const base = {
    from: options.from,
    to: options.to,
    allData: options.allData,
  };
  if (!scope.targetUserId) return base;

  return {
    ...base,
    ownerId: scope.targetUserId,
    createdBy: scope.targetUserId,
    memberId: scope.targetUserId,
    ids: scope.animalIds,
    forceEmpty: true,
  };
}

async function buildEntityCSV(supabase, farmId, scope, options, entity, meta) {
  let result;
  switch (entity) {
    case "animals":
      result = await buildAnimalsExport(farmId, scopedFilters(scope, options));
      break;
    case "transactions":
      result = await buildTransactionsExport(
        farmId,
        scopedFilters(scope, options)
      );
      break;
    case "inventory":
      result = await buildInventoryExport(farmId, scopedFilters(scope, options));
      break;
    case "health":
      result = await buildHealthExport(farmId, scopedFilters(scope, options));
      break;
    case "production":
      result = await buildProductionExport(farmId, scopedFilters(scope, options));
      break;
    case "members":
      result = await buildMembersExport(farmId, scopedFilters(scope, options));
      break;
    default:
      throw new Error("অজানা এক্সপোর্ট ধরন");
  }

  return {
    name: `${entity}.csv`,
    content: toCSV(result.rows ?? [], result.columns ?? [], meta),
  };
}

async function loadCategories(supabase, farmId) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .or(`farm_id.eq.${farmId},farm_id.is.null`)
    .is("deleted_at", null)
    .order("entity", { ascending: true })
    .order("sort_order", { ascending: true });
  throwIfError(error, "ক্যাটাগরি পড়া যায়নি");
  return plain(data ?? []);
}

function categoriesCSV(categories, farmId, meta) {
  const columns = [
    { key: "entity", label: "ধরন", format: "text" },
    { key: "code", label: "কোড", format: "text" },
    { key: "name_bn", label: "নাম (বাংলা)", format: "text" },
    { key: "name", label: "নাম", format: "text" },
    { key: "scope", label: "পরিধি", format: "text" },
    { key: "is_active", label: "সক্রিয়", format: "boolean" },
    { key: "sort_order", label: "ক্রম", format: "number" },
  ];
  const rows = categories.map((row) => ({
    ...row,
    scope: row.farm_id === farmId ? "খামার" : "সাধারণ",
  }));
  return toCSV(rows, columns, meta);
}

async function loadFieldDefinitions(supabase, farmId) {
  const { data, error } = await supabase
    .from("field_definitions")
    .select("*")
    .or(`farm_id.eq.${farmId},farm_id.is.null`)
    .order("entity", { ascending: true })
    .order("sort_order", { ascending: true });
  throwIfError(error, "অতিরিক্ত ঘর পড়া যায়নি");
  return plain(data ?? []);
}

// All raw rows are read through the caller's Supabase client, so the existing
// RLS policies still decide what is visible before any role scoping happens.
async function loadScopedRows(supabase, farmId, scope, options) {
  const target = scope.targetUserId;
  const { from, to } = options.allData ? { from: "", to: "" } : options;
  const animalIds =
    scope.animalIds && scope.animalIds.length ? scope.animalIds : [EMPTY_ID];

  let animalsQuery = supabase
    .from("animals")
    .select("*")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  if (target) animalsQuery = animalsQuery.in("id", animalIds);

  let transactionsQuery = supabase
    .from("transactions")
    .select("*")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  if (target) transactionsQuery = transactionsQuery.eq("paid_by", target);
  if (from) transactionsQuery = transactionsQuery.gte("date", from);
  if (to) transactionsQuery = transactionsQuery.lte("date", to);

  let itemsQuery = supabase
    .from("inventory_items")
    .select("*")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  if (target) itemsQuery = itemsQuery.eq("id", EMPTY_ID);

  let movementsQuery = supabase
    .from("inventory_movements")
    .select("*")
    .eq("farm_id", farmId);
  if (target) movementsQuery = movementsQuery.eq("item_id", EMPTY_ID);
  if (from) movementsQuery = movementsQuery.gte("date", from);
  if (to) movementsQuery = movementsQuery.lte("date", to);

  let healthQuery = supabase
    .from("health_records")
    .select("*")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  if (target) healthQuery = healthQuery.eq("created_by", target);
  if (from) healthQuery = healthQuery.gte("date", from);
  if (to) healthQuery = healthQuery.lte("date", to);

  let productionQuery = supabase
    .from("production_records")
    .select("*")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  if (target) productionQuery = productionQuery.eq("created_by", target);
  if (from) productionQuery = productionQuery.gte("date", from);
  if (to) productionQuery = productionQuery.lte("date", to);

  let membersQuery = supabase
    .from("farm_members")
    .select("*, profiles(full_name, phone)")
    .eq("farm_id", farmId)
    .is("deleted_at", null);
  if (target) membersQuery = membersQuery.eq("user_id", target);

  const queries = {
    animals: animalsQuery,
    transactions: transactionsQuery,
    inventory_items: itemsQuery,
    inventory_movements: movementsQuery,
    health_records: healthQuery,
    production_records: productionQuery,
    members: membersQuery,
  };

  const entries = await Promise.all(
    Object.entries(queries).map(async ([key, query]) => [key, await query])
  );
  const rows = {};
  for (const [key, result] of entries) {
    throwIfError(result.error, ROW_ERRORS[key]);
    rows[key] = plain(result.data ?? []);
  }
  return rows;
}

function customFieldsPayload(definitions, rows, exportedAt, description) {
  const values = {};
  for (const [fieldEntity, rowKey] of CUSTOM_ENTITY_TABLES) {
    values[fieldEntity] = (rows[rowKey] ?? []).map((row) => ({
      id: row.id ?? null,
      custom_fields: plain(row.custom_fields ?? {}),
    }));
  }

  return {
    format: "khamar-custom-fields",
    version: 1,
    exportedAt,
    filter: description,
    definitions,
    values,
  };
}

async function customFieldsFile(supabase, farmId, scope, options, exportedAt, description) {
  const [definitions, rows] = await Promise.all([
    loadFieldDefinitions(supabase, farmId),
    loadScopedRows(supabase, farmId, scope, options),
  ]);
  const payload = customFieldsPayload(definitions, rows, exportedAt, description);
  return {
    name: "custom_fields.json",
    content: JSON.stringify(payload, null, 2),
  };
}

export async function assembleExportBundle(supabase, context) {
  const options = normalizeOptions(context.options);
  const { farmId } = context;
  const [farm, scope] = await Promise.all([
    loadFarm(supabase, farmId),
    resolveScope(supabase, farmId, context, null, options),
  ]);
  const exportedAt = todayString();
  const description = filterDescription(options.section, options, scope);
  const meta = metaRow(farm.name, exportedAt, description);

  const files = await Promise.all(
    options.entities.map((entity) =>
      buildEntityCSV(supabase, farmId, scope, options, entity, meta)
    )
  );
  if (options.section === "full") {
    const categories = await loadCategories(supabase, farmId);
    files.push({
      name: "categories.csv",
      content: categoriesCSV(categories, farmId, meta),
    });
  }
  if (options.section !== "date") {
    files.push(
      await customFieldsFile(
        supabase,
        farmId,
        scope,
        options,
        exportedAt,
        description
      )
    );
  }

  const farmSlug = slugifyFarmName(farm.name, farmId);
  return plain({
    fileName: zipFileName(
      options.section === "date" ? "date_export" : "farm_export",
      farmSlug,
      options
    ),
    farmName: farm.name,
    farmSlug,
    description,
    scope: scope.targetUserId || !scope.exportAll ? "own" : "all",
    files,
  });
}

export async function assembleMemberBundle(supabase, context) {
  const { farmId, memberId } = context;
  const options = normalizeOptions({ section: "member", allData: true });
  const [farm, scope] = await Promise.all([
    loadFarm(supabase, farmId),
    resolveScope(supabase, farmId, context, memberId, options),
  ]);
  const exportedAt = todayString();
  const description = filterDescription("member", options, scope);
  const meta = metaRow(farm.name, exportedAt, description);

  const [entityFiles, categories, extraFile] = await Promise.all([
    Promise.all(
      EXPORT_ENTITIES.map((entity) =>
        buildEntityCSV(supabase, farmId, scope, options, entity, meta)
      )
    ),
    loadCategories(supabase, farmId),
    customFieldsFile(
      supabase,
      farmId,
      scope,
      options,
      exportedAt,
      description
    ),
  ]);

  const farmSlug = slugifyFarmName(farm.name, farmId);
  const memberSlug = String(scope.targetUserId ?? "self").slice(0, 8);
  return plain({
    fileName: `member_export_${farmSlug}_${memberSlug}.zip`,
    farmName: farm.name,
    farmSlug,
    description,
    scope: scope.exportAll ? "member" : "own",
    files: [
      ...entityFiles,
      {
        name: "categories.csv",
        content: categoriesCSV(categories, farmId, meta),
      },
      extraFile,
    ],
  });
}

export async function assembleFarmBackup(supabase, context) {
  const { farmId } = context;
  const options = normalizeOptions({ section: "backup", allData: true });
  const [farm, scope] = await Promise.all([
    loadFarm(supabase, farmId),
    resolveScope(supabase, farmId, context, null, options),
  ]);
  const exportedAt = todayString();
  const description = filterDescription("backup", options, scope);

  const [rows, definitions, categories, settingsResult] = await Promise.all([
    loadScopedRows(supabase, farmId, scope, options),
    loadFieldDefinitions(supabase, farmId),
    loadCategories(supabase, farmId),
    supabase
      .from("app_settings")
      .select("id, farm_id, key, value")
      .eq("farm_id", farmId),
  ]);
  throwIfError(settingsResult.error, "সেটিংস পড়া যায়নি");

  const backup = {
    format: "khamar-farm-backup",
    version: 1,
    exportedAt,
    filter: description,
    scope: scope.targetUserId || !scope.exportAll ? "own" : "all",
    farm,
    custom_fields: customFieldsPayload(
      definitions,
      rows,
      exportedAt,
      description
    ),
    field_definitions: definitions,
    categories,
    animals: rows.animals,
    transactions: rows.transactions,
    inventory: {
      items: rows.inventory_items,
      movements: rows.inventory_movements,
    },
    health_records: rows.health_records,
    production_records: rows.production_records,
    members: rows.members,
    settings: plain(settingsResult.data ?? []),
  };

  const farmSlug = slugifyFarmName(farm.name, farmId);
  return plain({
    fileName: `khamar_backup_${farmSlug}_${exportedAt.replaceAll("/", "-")}.json`,
    farmName: farm.name,
    farmSlug,
    description,
    content: JSON.stringify(backup, null, 2),
  });
}
