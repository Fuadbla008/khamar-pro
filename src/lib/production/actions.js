"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { validateCustomFields } from "@/lib/fields/validate";
import { UNITS } from "@/lib/inventory/constants";
import {
  PRODUCTION_INCOME_CATEGORY,
  PRODUCTION_TYPE_LABELS,
  PRODUCTION_TYPES,
} from "@/lib/production/constants";
import { decimalToCents, multiplyDecimal } from "@/lib/utils/decimal";

const DECIMAL = /^\d+(\.\d{1,2})?$/;
const OPTIONAL_DECIMAL = /^(\d+(\.\d{1,2})?)?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const OPTIONAL_UUID =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/i;

const recordSchema = z.object({
  farmId: z.uuid(),
  recordId: z.string().regex(OPTIONAL_UUID),
  animalId: z.string().regex(OPTIONAL_UUID, "সঠিক পশু নির্বাচন করুন"),
  type: z.enum(PRODUCTION_TYPES.map((item) => item.value)),
  qty: z
    .string()
    .trim()
    .regex(DECIMAL, "সঠিক পরিমাণ দিন")
    .refine((value) => Number(value) > 0, "পরিমাণ ০ এর বেশি হতে হবে"),
  unit: z.enum(UNITS.map((item) => item.value)),
  date: z.string().regex(ISO_DATE, "সঠিক তারিখ দিন"),
  pricePerUnit: z.string().trim().regex(OPTIONAL_DECIMAL, "সঠিক মূল্য দিন"),
  recordIncome: z.string(),
  notes: z.string(),
});

function formValues(formData) {
  return {
    farmId: String(formData.get("farmId") ?? ""),
    recordId: String(formData.get("recordId") ?? ""),
    animalId: String(formData.get("animalId") ?? ""),
    type: String(formData.get("type") ?? ""),
    qty: String(formData.get("qty") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    date: String(formData.get("date") ?? ""),
    pricePerUnit: String(formData.get("pricePerUnit") ?? "0"),
    recordIncome: String(formData.get("recordIncome") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

function revalidateProduction(farmId, recordId, animalId) {
  revalidatePath(`/f/${farmId}/production`);
  revalidatePath(`/f/${farmId}/transactions`);
  revalidatePath(`/f/${farmId}/dashboard`);
  if (animalId) revalidatePath(`/f/${farmId}/animals/${animalId}`);
  if (recordId) revalidatePath(`/f/${farmId}/production/${recordId}`);
}

async function validateAnimal(supabase, farmId, animalId) {
  if (!animalId) return true;
  const { data } = await supabase
    .from("animals")
    .select("id")
    .eq("id", animalId)
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}

// Category codes are seeded data, not app labels: mapping stays in constants
// and the active farm category is resolved through RLS before it is used.
async function resolveIncomeCategory(supabase, type) {
  const preferred = PRODUCTION_INCOME_CATEGORY[type] ?? "income_other";

  const { data } = await supabase
    .from("categories")
    .select("code")
    .eq("entity", "transaction")
    .eq("transaction_type", "income")
    .eq("code", preferred)
    .is("deleted_at", null)
    .limit(1);
  if (data?.length) return preferred;

  const { data: fallback } = await supabase
    .from("categories")
    .select("code")
    .eq("entity", "transaction")
    .eq("transaction_type", "income")
    .eq("code", "income_other")
    .is("deleted_at", null)
    .limit(1);
  return fallback?.length ? "income_other" : null;
}

function incomeNote(type, notes) {
  const label = PRODUCTION_TYPE_LABELS[type] ?? type;
  return `উৎপাদন — ${label}${notes ? ` · ${notes}` : ""}`;
}

async function insertIncomeTransaction(supabase, payload) {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      farm_id: payload.farmId,
      type: "income",
      category_code: payload.categoryCode,
      amount: payload.amount,
      date: payload.date,
      paid_by: null,
      animal_id: payload.animalId || null,
      note: payload.note,
      attachment_url: null,
      custom_fields: {},
    })
    .select("id")
    .single();

  return error || !data ? { error: "আয়ের লেনদেন যোগ করা যায়নি" } : { id: data.id };
}

async function softDeleteTransaction(supabase, farmId, transactionId) {
  if (!transactionId) return;
  await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", transactionId)
    .eq("farm_id", farmId);
}

function productionRow(values, customFields, totalIncome, linkedTransactionId) {
  return {
    animal_id: values.animalId || null,
    type: values.type,
    qty: values.qty,
    unit: values.unit,
    date: values.date,
    price_per_unit: values.pricePerUnit === "" ? "0.00" : values.pricePerUnit,
    total_income: totalIncome,
    linked_transaction_id: linkedTransactionId,
    notes: values.notes || null,
    custom_fields: customFields,
  };
}

export async function createProductionAction(_prevState, formData) {
  const parsed = recordSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const values = parsed.data;
  const { farmId } = values;
  const { supabase, user } = await requireFarmAccess(farmId);

  const custom = await validateCustomFields(formData, supabase, farmId, "production");
  if (custom.error) return { error: custom.error };

  if (!(await validateAnimal(supabase, farmId, values.animalId))) {
    return { error: "পশু খুঁজে পাওয়া যায়নি" };
  }

  const totalIncome = multiplyDecimal(values.qty, values.pricePerUnit || "0");
  const wantsIncome = values.recordIncome === "on";
  if (wantsIncome && decimalToCents(totalIncome) <= 0n) {
    return { error: "আয় হিসেবে রেকর্ড করতে একক মূল্য দিন" };
  }

  let transactionId = null;
  if (wantsIncome) {
    const categoryCode = await resolveIncomeCategory(supabase, values.type);
    if (!categoryCode) {
      return { error: "আয়ের ক্যাটাগরি খুঁজে পাওয়া যায়নি" };
    }

    const transaction = await insertIncomeTransaction(supabase, {
      farmId,
      animalId: values.animalId,
      date: values.date,
      categoryCode,
      amount: totalIncome,
      note: incomeNote(values.type, values.notes),
    });
    if (transaction.error) return transaction;
    transactionId = transaction.id;
  }

  const { error } = await supabase.from("production_records").insert({
    farm_id: farmId,
    ...productionRow(values, custom.value, totalIncome, transactionId),
    created_by: user.id,
  });

  if (error) {
    await softDeleteTransaction(supabase, farmId, transactionId);
    return { error: "উৎপাদন যোগ করা যায়নি, আবার চেষ্টা করুন" };
  }

  revalidateProduction(farmId, null, values.animalId || null);
  return { ok: true };
}

export async function updateProductionAction(_prevState, formData) {
  const parsed = recordSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const values = parsed.data;
  if (!values.recordId) {
    return { error: "রেকর্ড খুঁজে পাওয়া যায়নি" };
  }

  const { farmId, recordId } = values;
  const { supabase } = await requireFarmAccess(farmId);

  const { data: existing } = await supabase
    .from("production_records")
    .select("linked_transaction_id")
    .eq("id", recordId)
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return { error: "রেকর্ড খুঁজে পাওয়া যায়নি" };
  }

  const custom = await validateCustomFields(formData, supabase, farmId, "production");
  if (custom.error) return { error: custom.error };

  if (!(await validateAnimal(supabase, farmId, values.animalId))) {
    return { error: "পশু খুঁজে পাওয়া যায়নি" };
  }

  const totalIncome = multiplyDecimal(values.qty, values.pricePerUnit || "0");
  const wantsIncome = values.recordIncome === "on";
  if (wantsIncome && decimalToCents(totalIncome) <= 0n) {
    return { error: "আয় হিসেবে রেকর্ড করতে একক মূল্য দিন" };
  }

  let linkedTransactionId = existing.linked_transaction_id ?? null;

  if (!wantsIncome && linkedTransactionId) {
    await softDeleteTransaction(supabase, farmId, linkedTransactionId);
    linkedTransactionId = null;
  } else if (wantsIncome && !linkedTransactionId) {
    const categoryCode = await resolveIncomeCategory(supabase, values.type);
    if (!categoryCode) {
      return { error: "আয়ের ক্যাটাগরি খুঁজে পাওয়া যায়নি" };
    }

    const transaction = await insertIncomeTransaction(supabase, {
      farmId,
      animalId: values.animalId,
      date: values.date,
      categoryCode,
      amount: totalIncome,
      note: incomeNote(values.type, values.notes),
    });
    if (transaction.error) return transaction;
    linkedTransactionId = transaction.id;
  } else if (wantsIncome && linkedTransactionId) {
    const categoryCode = await resolveIncomeCategory(supabase, values.type);
    if (!categoryCode) {
      return { error: "আয়ের ক্যাটাগরি খুঁজে পাওয়া যায়নি" };
    }

    const { error } = await supabase
      .from("transactions")
      .update({
        category_code: categoryCode,
        amount: totalIncome,
        date: values.date,
        animal_id: values.animalId || null,
        note: incomeNote(values.type, values.notes),
      })
      .eq("id", linkedTransactionId)
      .eq("farm_id", farmId)
      .is("deleted_at", null);

    if (error) {
      return { error: "লেনদেন হালনাগাদ করা যায়নি" };
    }
  }

  const { error } = await supabase
    .from("production_records")
    .update(productionRow(values, custom.value, totalIncome, linkedTransactionId))
    .eq("id", recordId)
    .eq("farm_id", farmId)
    .is("deleted_at", null);

  if (error) {
    return { error: "রেকর্ড হালনাগাদ করা যায়নি" };
  }

  revalidateProduction(farmId, recordId, values.animalId || null);
  return { ok: true };
}

export async function deleteProductionAction(formData) {
  const farmId = String(formData.get("farmId") ?? "");
  const recordId = String(formData.get("recordId") ?? "");
  if (!farmId || !recordId) return;

  const { supabase } = await requireFarmAccess(farmId);

  const { data: existing } = await supabase
    .from("production_records")
    .select("linked_transaction_id, animal_id")
    .eq("id", recordId)
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) return;

  const deletedAt = new Date().toISOString();
  await supabase
    .from("production_records")
    .update({ deleted_at: deletedAt })
    .eq("id", recordId)
    .eq("farm_id", farmId);

  await softDeleteTransaction(supabase, farmId, existing.linked_transaction_id);

  revalidateProduction(farmId, null, existing.animal_id || null);
}
