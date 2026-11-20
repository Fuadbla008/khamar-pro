"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { validateCustomFields } from "@/lib/fields/validate";

const transactionSchema = z.object({
  farmId: z.uuid(),
  transactionId: z.uuid().optional(),
  type: z.enum(["income", "expense"]),
  categoryCode: z.string().min(1, "ক্যাটাগরি নির্বাচন করুন"),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "সঠিক অর্থের পরিমাণ দিন")
    .refine((value) => Number(value) > 0, "অর্থের পরিমাণ ০ এর বেশি হতে হবে"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "সঠিক তারিখ দিন"),
  paidBy: z.string(),
  animalId: z.string(),
  note: z.string(),
  attachmentUrl: z.string().trim(),
});

function formValues(formData) {
  return {
    farmId: String(formData.get("farmId") ?? ""),
    transactionId: String(formData.get("transactionId") ?? "") || undefined,
    type: String(formData.get("type") ?? "expense"),
    categoryCode: String(formData.get("categoryCode") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    date: String(formData.get("date") ?? ""),
    paidBy: String(formData.get("paidBy") ?? "none"),
    animalId: String(formData.get("animalId") ?? "none"),
    note: String(formData.get("note") ?? ""),
    attachmentUrl: String(formData.get("attachmentUrl") ?? ""),
  };
}

async function validateReferences(supabase, farmId, parsed) {
  const { data: categories } = await supabase
    .from("categories")
    .select("code")
    .eq("entity", "transaction")
    .eq("code", parsed.categoryCode)
    .is("deleted_at", null)
    .or(`transaction_type.eq.${parsed.type},transaction_type.is.null`)
    .limit(1);

  if (!categories?.length) {
    return { error: "এই ধরনের জন্য সঠিক ক্যাটাগরি নির্বাচন করুন" };
  }

  if (parsed.paidBy !== "none") {
    const { data: members } = await supabase
      .from("farm_members")
      .select("id")
      .eq("farm_id", farmId)
      .eq("user_id", parsed.paidBy)
      .is("deleted_at", null)
      .limit(1);

    if (!members?.length) {
      return { error: "সদস্য খুঁজে পাওয়া যায়নি" };
    }
  }

  if (parsed.animalId !== "none") {
    const { data: animals } = await supabase
      .from("animals")
      .select("id")
      .eq("farm_id", farmId)
      .eq("id", parsed.animalId)
      .is("deleted_at", null)
      .limit(1);

    if (!animals?.length) {
      return { error: "পশু খুঁজে পাওয়া যায়নি" };
    }
  }

  return {};
}

function toRow(parsed, customFields) {
  return {
    type: parsed.type,
    category_code: parsed.categoryCode,
    amount: Number(parsed.amount),
    date: parsed.date,
    paid_by: parsed.paidBy === "none" ? null : parsed.paidBy,
    animal_id: parsed.animalId === "none" ? null : parsed.animalId,
    note: parsed.note || null,
    attachment_url: parsed.attachmentUrl || null,
    custom_fields: customFields,
  };
}

export async function createTransactionAction(formData) {
  const parsed = transactionSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { farmId } = parsed.data;
  const { supabase } = await requireFarmAccess(farmId);

  const referenceError = await validateReferences(supabase, farmId, parsed.data);
  if (referenceError.error) return referenceError;

  const custom = await validateCustomFields(
    formData,
    supabase,
    farmId,
    "transaction"
  );
  if (custom.error) return { error: custom.error };

  const { data, error } = await supabase
    .from("transactions")
    .insert({ farm_id: farmId, ...toRow(parsed.data, custom.value) })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "লেনদেন যোগ করা যায়নি, আবার চেষ্টা করুন" };
  }

  revalidatePath(`/f/${farmId}/transactions`);
  revalidatePath(`/f/${farmId}/dashboard`);
  return { ok: true, id: data.id };
}

export async function updateTransactionAction(formData) {
  const parsed = transactionSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  if (!parsed.data.transactionId) {
    return { error: "লেনদেন খুঁজে পাওয়া যায়নি" };
  }

  const { farmId, transactionId } = parsed.data;
  const { supabase } = await requireFarmAccess(farmId);

  const referenceError = await validateReferences(supabase, farmId, parsed.data);
  if (referenceError.error) return referenceError;

  const custom = await validateCustomFields(
    formData,
    supabase,
    farmId,
    "transaction"
  );
  if (custom.error) return { error: custom.error };

  const { error } = await supabase
    .from("transactions")
    .update(toRow(parsed.data, custom.value))
    .eq("id", transactionId)
    .eq("farm_id", farmId)
    .is("deleted_at", null);

  if (error) {
    return { error: "লেনদেন হালনাগাদ করা যায়নি" };
  }

  revalidatePath(`/f/${farmId}/transactions`);
  revalidatePath(`/f/${farmId}/dashboard`);
  return { ok: true, id: transactionId };
}

export async function deleteTransactionAction(formData) {
  const farmId = String(formData.get("farmId") ?? "");
  const transactionId = String(formData.get("transactionId") ?? "");

  const { supabase } = await requireFarmAccess(farmId);

  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", transactionId)
    .eq("farm_id", farmId);

  if (error) {
    return { error: "লেনদেন মুছে ফেলা যায়নি" };
  }

  revalidatePath(`/f/${farmId}/transactions`);
  revalidatePath(`/f/${farmId}/dashboard`);
  return { ok: true };
}
