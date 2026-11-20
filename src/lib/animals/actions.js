"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { validateCustomFields } from "@/lib/fields/validate";
import {
  scheduleBaseDate,
  scheduleHealthForAnimal,
} from "@/lib/health/schedule";

const animalSchema = z.object({
  farmId: z.uuid(),
  animalId: z.uuid().optional(),
  tagNo: z.string().trim().min(1, "ট্যাগ নম্বর দিন"),
  categoryCode: z.string().min(1, "প্রাণীর ধরন নির্বাচন করুন"),
  name: z.string().trim(),
  gender: z.enum(["male", "female", "unknown"]),
  dob: z.string(),
  purchaseDate: z.string(),
  purchasePrice: z.string(),
  status: z.enum(["active", "sick", "sold", "dead", "transferred"]),
  photoUrl: z.string().trim(),
});

function formValues(formData) {
  return {
    farmId: String(formData.get("farmId") ?? ""),
    animalId: String(formData.get("animalId") ?? "") || undefined,
    tagNo: String(formData.get("tagNo") ?? ""),
    categoryCode: String(formData.get("categoryCode") ?? ""),
    name: String(formData.get("name") ?? ""),
    gender: String(formData.get("gender") ?? "unknown"),
    dob: String(formData.get("dob") ?? ""),
    purchaseDate: String(formData.get("purchaseDate") ?? ""),
    purchasePrice: String(formData.get("purchasePrice") ?? ""),
    status: String(formData.get("status") ?? "active"),
    photoUrl: String(formData.get("photoUrl") ?? ""),
  };
}

// Custom-field validation lives in @/lib/fields/validate so every entity uses
// the same authoritative check.

function toRow(parsed, customFields) {
  return {
    category_code: parsed.categoryCode,
    tag_no: parsed.tagNo,
    name: parsed.name || null,
    gender: parsed.gender,
    dob: parsed.dob || null,
    purchase_date: parsed.purchaseDate || null,
    purchase_price:
      parsed.purchasePrice === "" ? null : Number(parsed.purchasePrice),
    status: parsed.status,
    photo_url: parsed.photoUrl || null,
    custom_fields: customFields,
  };
}

export async function createAnimalAction(_prevState, formData) {
  const parsed = animalSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { farmId } = parsed.data;
  const { supabase, user } = await requireFarmAccess(farmId);

  const custom = await validateCustomFields(
    formData,
    supabase,
    farmId,
    "animal"
  );
  if (custom.error) return { error: custom.error };

  const { data, error } = await supabase
    .from("animals")
    .insert({ farm_id: farmId, ...toRow(parsed.data, custom.value) })
    .select("id, category_code, purchase_date, dob")
    .single();

  if (error || !data) {
    return { error: "পশু যোগ করা যায়নি, আবার চেষ্টা করুন" };
  }

  // Species is the animal category slug; templates matching it are turned into
  // pending health records so the farmer only has to confirm/complete them.
  await scheduleHealthForAnimal(supabase, {
    farmId,
    animalId: data.id,
    species: data.category_code,
    baseDate: scheduleBaseDate(data),
    userId: user.id,
  });

  revalidatePath(`/f/${farmId}/animals`);
  revalidatePath(`/f/${farmId}/health`);
  revalidatePath(`/f/${farmId}/dashboard`);
  redirect(`/f/${farmId}/animals/${data.id}`);
}

export async function updateAnimalAction(_prevState, formData) {
  const parsed = animalSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  if (!parsed.data.animalId) {
    return { error: "পশু খুঁজে পাওয়া যায়নি" };
  }

  const { farmId, animalId } = parsed.data;
  const { supabase: client } = await requireFarmAccess(farmId);

  const custom = await validateCustomFields(
    formData,
    client,
    farmId,
    "animal"
  );
  if (custom.error) return { error: custom.error };

  const { error } = await client
    .from("animals")
    .update(toRow(parsed.data, custom.value))
    .eq("id", animalId)
    .eq("farm_id", farmId)
    .is("deleted_at", null);

  if (error) {
    return { error: "পশু হালনাগাদ করা যায়নি" };
  }

  revalidatePath(`/f/${farmId}/animals`);
  revalidatePath(`/f/${farmId}/animals/${animalId}`);
  redirect(`/f/${farmId}/animals/${animalId}`);
}

export async function deleteAnimalAction(formData) {
  const farmId = String(formData.get("farmId") ?? "");
  const animalId = String(formData.get("animalId") ?? "");
  const { supabase } = await requireFarmAccess(farmId);

  const { error } = await supabase
    .from("animals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", animalId)
    .eq("farm_id", farmId);

  if (error) {
    redirect(`/f/${farmId}/animals?error=delete-failed`);
  }

  revalidatePath(`/f/${farmId}/animals`);
  redirect(`/f/${farmId}/animals`);
}
