"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { validateCustomFields } from "@/lib/fields/validate";
import { UNITS } from "@/lib/inventory/constants";

const DECIMAL = /^\d+(\.\d{1,2})?$/;
const OPTIONAL_DECIMAL = /^(\d+(\.\d{1,2})?)?$/;

const itemSchema = z.object({
  farmId: z.uuid(),
  itemId: z.uuid().optional(),
  categoryCode: z.string().min(1, "ক্যাটাগরি নির্বাচন করুন"),
  name: z.string().trim(),
  nameBn: z.string().trim().min(1, "আইটেমের নাম দিন"),
  unit: z.enum(UNITS.map((item) => item.value)),
  currentStock: z.string().trim().regex(DECIMAL, "সঠিক সংখ্যা দিন"),
  minStock: z.string().trim().regex(DECIMAL, "সঠিক সংখ্যা দিন"),
  unitPrice: z.string().trim().regex(OPTIONAL_DECIMAL, "সঠিক মূল্য দিন"),
});

const movementSchema = z.object({
  farmId: z.uuid(),
  itemId: z.uuid(),
  direction: z.enum(["in", "out"]),
  qty: z
    .string()
    .trim()
    .regex(DECIMAL, "সঠিক পরিমাণ দিন")
    .refine((value) => Number(value) > 0, "পরিমাণ ০ এর বেশি হতে হবে"),
  unitPrice: z.string().trim().regex(OPTIONAL_DECIMAL, "সঠিক মূল্য দিন"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "সঠিক তারিখ দিন"),
  note: z.string(),
});

function itemValues(formData) {
  return {
    farmId: String(formData.get("farmId") ?? ""),
    itemId: String(formData.get("itemId") ?? "") || undefined,
    categoryCode: String(formData.get("categoryCode") ?? ""),
    name: String(formData.get("name") ?? ""),
    nameBn: String(formData.get("nameBn") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    currentStock: String(formData.get("currentStock") ?? "0"),
    minStock: String(formData.get("minStock") ?? "0"),
    unitPrice: String(formData.get("unitPrice") ?? ""),
  };
}

function movementValues(formData) {
  return {
    farmId: String(formData.get("farmId") ?? ""),
    itemId: String(formData.get("itemId") ?? ""),
    direction: String(formData.get("direction") ?? "in"),
    qty: String(formData.get("qty") ?? ""),
    unitPrice: String(formData.get("unitPrice") ?? ""),
    date: String(formData.get("date") ?? ""),
    note: String(formData.get("note") ?? ""),
  };
}

function moneyOrNull(value) {
  return value === "" ? null : Number(value);
}

// Every stock change goes through inventory_movements so the recompute trigger
// stays the single source of truth for inventory_items.current_stock.
async function insertMovement(supabase, payload) {
  const price = payload.unitPrice;
  const qty = Number(payload.qty);
  // Quantize to 2 decimals before it reaches the numeric(12,2) column.
  const totalCost = price == null ? null : Number((qty * price).toFixed(2));

  const { error } = await supabase.from("inventory_movements").insert({
    item_id: payload.itemId,
    farm_id: payload.farmId,
    direction: payload.direction,
    qty,
    unit_price: price,
    total_cost: totalCost,
    note: payload.note ?? null,
    date: payload.date,
    created_by: payload.userId,
  });

  return error ? { error: "স্টক হালনাগাদ করা যায়নি, আবার চেষ্টা করুন" } : {};
}

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

async function validateCategory(supabase, categoryCode) {
  const { data } = await supabase
    .from("categories")
    .select("code")
    .eq("entity", "inventory")
    .eq("code", categoryCode)
    .is("deleted_at", null)
    .limit(1);

  if (!data?.length) {
    return { error: "সঠিক ক্যাটাগরি নির্বাচন করুন" };
  }
  return {};
}

function toItemRow(parsed, customFields) {
  return {
    category_code: parsed.categoryCode,
    name: parsed.name || null,
    name_bn: parsed.nameBn,
    unit: parsed.unit,
    min_stock: Number(parsed.minStock),
    unit_price: moneyOrNull(parsed.unitPrice),
    custom_fields: customFields,
  };
}

export async function createItemAction(_prevState, formData) {
  const parsed = itemSchema.safeParse(itemValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { farmId } = parsed.data;
  const { supabase, user } = await requireFarmAccess(farmId);

  const categoryError = await validateCategory(supabase, parsed.data.categoryCode);
  if (categoryError.error) return categoryError;

  const custom = await validateCustomFields(formData, supabase, farmId, "inventory");
  if (custom.error) return { error: custom.error };

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      farm_id: farmId,
      current_stock: 0,
      ...toItemRow(parsed.data, custom.value),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "আইটেম যোগ করা যায়নি, আবার চেষ্টা করুন" };
  }

  // The entered stock becomes an opening movement, not a direct column write.
  if (Number(parsed.data.currentStock) > 0) {
    const movementError = await insertMovement(supabase, {
      farmId,
      itemId: data.id,
      userId: user.id,
      direction: "in",
      qty: parsed.data.currentStock,
      unitPrice: moneyOrNull(parsed.data.unitPrice),
      note: "প্রারম্ভিক স্টক",
      date: localToday(),
    });
    if (movementError.error) return movementError;
  }

  revalidatePath(`/f/${farmId}/inventory`);
  revalidatePath(`/f/${farmId}/dashboard`);
  redirect(`/f/${farmId}/inventory/${data.id}`);
}

export async function updateItemAction(_prevState, formData) {
  const parsed = itemSchema.safeParse(itemValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  if (!parsed.data.itemId) {
    return { error: "আইটেম খুঁজে পাওয়া যায়নি" };
  }

  const { farmId, itemId } = parsed.data;
  const { supabase, user } = await requireFarmAccess(farmId);

  const { data: existing } = await supabase
    .from("inventory_items")
    .select("current_stock")
    .eq("id", itemId)
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return { error: "আইটেম খুঁজে পাওয়া যায়নি" };
  }

  const categoryError = await validateCategory(supabase, parsed.data.categoryCode);
  if (categoryError.error) return categoryError;

  const custom = await validateCustomFields(formData, supabase, farmId, "inventory");
  if (custom.error) return { error: custom.error };

  const { error } = await supabase
    .from("inventory_items")
    .update(toItemRow(parsed.data, custom.value))
    .eq("id", itemId)
    .eq("farm_id", farmId)
    .is("deleted_at", null);

  if (error) {
    return { error: "আইটেম হালনাগাদ করা যায়নি" };
  }

  // A changed stock number is recorded as an adjustment movement so the
  // history stays complete and the trigger remains the only stock writer.
  const nextStock = Number(parsed.data.currentStock);
  const difference = Number((nextStock - Number(existing.current_stock ?? 0)).toFixed(2));
  if (difference !== 0) {
    const movementError = await insertMovement(supabase, {
      farmId,
      itemId,
      userId: user.id,
      direction: difference > 0 ? "in" : "out",
      qty: Math.abs(difference),
      unitPrice: moneyOrNull(parsed.data.unitPrice),
      note: "স্টক সমন্বয়",
      date: localToday(),
    });
    if (movementError.error) return movementError;
  }

  revalidatePath(`/f/${farmId}/inventory`);
  revalidatePath(`/f/${farmId}/inventory/${itemId}`);
  redirect(`/f/${farmId}/inventory/${itemId}`);
}

export async function deleteItemAction(formData) {
  const farmId = String(formData.get("farmId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const { supabase } = await requireFarmAccess(farmId);

  const { error } = await supabase
    .from("inventory_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("farm_id", farmId);

  if (error) {
    redirect(`/f/${farmId}/inventory?error=delete-failed`);
  }

  revalidatePath(`/f/${farmId}/inventory`);
  revalidatePath(`/f/${farmId}/dashboard`);
  redirect(`/f/${farmId}/inventory`);
}

// Stock itself is never written here: the inventory_movements trigger owns it.
export async function createMovementAction(_prevState, formData) {
  const parsed = movementSchema.safeParse(movementValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { farmId, itemId, direction, qty, unitPrice, date, note } = parsed.data;
  const { supabase, user } = await requireFarmAccess(farmId);

  const { data: item } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("id", itemId)
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!item) {
    return { error: "আইটেম খুঁজে পাওয়া যায়নি" };
  }

  const movementError = await insertMovement(supabase, {
    farmId,
    itemId,
    userId: user.id,
    direction,
    qty,
    unitPrice: moneyOrNull(unitPrice),
    note,
    date,
  });
  if (movementError.error) return movementError;

  revalidatePath(`/f/${farmId}/inventory`);
  revalidatePath(`/f/${farmId}/inventory/${itemId}`);
  revalidatePath(`/f/${farmId}/dashboard`);
  return { ok: true };
}
