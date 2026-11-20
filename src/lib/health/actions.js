"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { validateCustomFields } from "@/lib/fields/validate";
import { HEALTH_TYPES } from "@/lib/health/constants";
import { addDays } from "@/lib/health/schedule";

const DECIMAL = /^\d+(\.\d{1,2})?$/;
const OPTIONAL_DECIMAL = /^(\d+(\.\d{1,2})?)?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const OPTIONAL_DATE = /^(\d{4}-\d{2}-\d{2})?$/;
const OPTIONAL_UUID = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/i;

const recordSchema = z.object({
  farmId: z.uuid(),
  recordId: z.uuid().optional(),
  animalId: z.string().regex(OPTIONAL_UUID, "সঠিক পশু নির্বাচন করুন"),
  type: z.enum(HEALTH_TYPES.map((item) => item.value)),
  title: z.string().trim().min(1, "শিরোনাম দিন"),
  medicineItemId: z.string().regex(OPTIONAL_UUID, "সঠিক ঔষধ নির্বাচন করুন"),
  dosage: z.string().trim(),
  date: z.string().regex(ISO_DATE, "সঠিক তারিখ দিন"),
  nextDueDate: z.string().regex(OPTIONAL_DATE, "সঠিক তারিখ দিন"),
  cost: z.string().trim().regex(OPTIONAL_DECIMAL, "সঠিক খরচ দিন"),
  notes: z.string(),
  isDone: z.string(),
});

function recordValues(formData) {
  return {
    farmId: String(formData.get("farmId") ?? ""),
    recordId: String(formData.get("recordId") ?? "") || undefined,
    animalId: String(formData.get("animalId") ?? ""),
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    medicineItemId: String(formData.get("medicineItemId") ?? ""),
    dosage: String(formData.get("dosage") ?? ""),
    date: String(formData.get("date") ?? ""),
    nextDueDate: String(formData.get("nextDueDate") ?? ""),
    cost: String(formData.get("cost") ?? "0"),
    notes: String(formData.get("notes") ?? ""),
    isDone: String(formData.get("isDone") ?? ""),
  };
}

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function revalidateHealth(farmId, recordId, animalId) {
  revalidatePath(`/f/${farmId}/health`);
  revalidatePath(`/f/${farmId}/dashboard`);
  revalidatePath(`/f/${farmId}/animals`);
  if (animalId) revalidatePath(`/f/${farmId}/animals/${animalId}`);
  if (recordId) revalidatePath(`/f/${farmId}/health/${recordId}`);
}

async function checkReference(supabase, table, id, farmId) {
  if (!id) return true;
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}

// When a scheduled record is completed without an explicit follow-up date,
// derive one from its template's recurring interval.
async function resolveNextDueDate(supabase, existing, parsed) {
  if (parsed.nextDueDate) return parsed.nextDueDate;
  if (!parsed.isDone || !existing?.template_id) return null;

  const { data: template } = await supabase
    .from("health_templates")
    .select("is_recurring, recurring_days")
    .eq("id", existing.template_id)
    .maybeSingle();

  if (!template?.is_recurring || !template.recurring_days) return null;
  return addDays(parsed.date, template.recurring_days);
}

export async function createHealthRecordAction(_prevState, formData) {
  const parsed = recordSchema.safeParse(recordValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const values = parsed.data;
  const { farmId } = values;
  const { supabase, user } = await requireFarmAccess(farmId);

  const custom = await validateCustomFields(formData, supabase, farmId, "health");
  if (custom.error) return { error: custom.error };

  if (!(await checkReference(supabase, "animals", values.animalId || null, farmId))) {
    return { error: "পশু খুঁজে পাওয়া যায়নি" };
  }
  if (
    !(await checkReference(
      supabase,
      "inventory_items",
      values.medicineItemId || null,
      farmId
    ))
  ) {
    return { error: "ঔষধ খুঁজে পাওয়া যায়নি" };
  }

  const { error } = await supabase.from("health_records").insert({
    farm_id: farmId,
    animal_id: values.animalId || null,
    type: values.type,
    title: values.title,
    medicine_item_id: values.medicineItemId || null,
    dosage: values.dosage || null,
    notes: values.notes || null,
    date: values.date,
    next_due_date: values.nextDueDate || null,
    cost: values.cost === "" ? 0 : Number(values.cost),
    created_by: user.id,
    template_id: null,
    is_done: values.isDone === "on",
    custom_fields: custom.value,
  });

  if (error) {
    return { error: "রেকর্ড যোগ করা যায়নি, আবার চেষ্টা করুন" };
  }

  revalidateHealth(farmId, null, values.animalId || null);
  return { ok: true };
}

export async function updateHealthRecordAction(_prevState, formData) {
  const parsed = recordSchema.safeParse(recordValues(formData));
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
    .from("health_records")
    .select("template_id")
    .eq("id", recordId)
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return { error: "রেকর্ড খুঁজে পাওয়া যায়নি" };
  }

  const custom = await validateCustomFields(formData, supabase, farmId, "health");
  if (custom.error) return { error: custom.error };

  if (!(await checkReference(supabase, "animals", values.animalId || null, farmId))) {
    return { error: "পশু খুঁজে পাওয়া যায়নি" };
  }
  if (
    !(await checkReference(
      supabase,
      "inventory_items",
      values.medicineItemId || null,
      farmId
    ))
  ) {
    return { error: "ঔষধ খুঁজে পাওয়া যায়নি" };
  }

  const nextDueDate = await resolveNextDueDate(supabase, existing, values);

  const { error } = await supabase
    .from("health_records")
    .update({
      animal_id: values.animalId || null,
      type: values.type,
      title: values.title,
      medicine_item_id: values.medicineItemId || null,
      dosage: values.dosage || null,
      notes: values.notes || null,
      date: values.date,
      next_due_date: nextDueDate,
      cost: values.cost === "" ? 0 : Number(values.cost),
      is_done: values.isDone === "on",
      custom_fields: custom.value,
    })
    .eq("id", recordId)
    .eq("farm_id", farmId)
    .is("deleted_at", null);

  if (error) {
    return { error: "রেকর্ড হালনাগাদ করা যায়নি" };
  }

  revalidateHealth(farmId, recordId, values.animalId || null);
  return { ok: true };
}

export async function deleteHealthRecordAction(formData) {
  const farmId = String(formData.get("farmId") ?? "");
  const recordId = String(formData.get("recordId") ?? "");
  if (!farmId || !recordId) return;

  const { supabase } = await requireFarmAccess(farmId);

  await supabase
    .from("health_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", recordId)
    .eq("farm_id", farmId);

  revalidateHealth(farmId, null, null);
}

// Quick actions from the animal card/table. The status change and the health
// record are two writes; the record is the audit trail for that status change.
async function setAnimalStatus(formData, status, type, title) {
  const farmId = String(formData.get("farmId") ?? "");
  const animalId = String(formData.get("animalId") ?? "");
  if (!farmId || !animalId) return;

  const { supabase, user } = await requireFarmAccess(farmId);

  const { data: animal } = await supabase
    .from("animals")
    .select("id, tag_no")
    .eq("id", animalId)
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!animal) return;

  await supabase
    .from("animals")
    .update({ status })
    .eq("id", animalId)
    .eq("farm_id", farmId);

  await supabase.from("health_records").insert({
    farm_id: farmId,
    animal_id: animalId,
    type,
    title: `${title} — ${animal.tag_no}`,
    medicine_item_id: null,
    dosage: null,
    notes: null,
    date: localToday(),
    next_due_date: null,
    cost: 0,
    created_by: user.id,
    template_id: null,
    is_done: true,
    custom_fields: {},
  });

  revalidateHealth(farmId, null, animalId);
}

export async function markAnimalSickAction(formData) {
  await setAnimalStatus(formData, "sick", "sick", "অসুস্থতা");
}

export async function markAnimalDeadAction(formData) {
  await setAnimalStatus(formData, "dead", "death", "মৃত্যু");
}
