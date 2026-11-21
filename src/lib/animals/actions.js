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
import { createAdminClient } from "@/lib/supabase/admin";

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

const PURCHASE_CATEGORY = "animal_purchase";
const PURCHASE_MARKER = "[animal:";

function purchaseNote(tagNo, animalId) {
  return `পশু ক্রয় — ${tagNo} ${PURCHASE_MARKER}${animalId}]`;
}

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// The service-role key is optional (local/dev setups may omit it). When it is
// present the admin client bypasses transaction RLS so a member who can only
// manage animals still gets the ledger row. Otherwise we fall back to the
// user-scoped client and surface any permissions failure as an error state.
function ledgerClient(fallback) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return fallback;
  try {
    return createAdminClient();
  } catch {
    return fallback;
  }
}

function revalidateAnimalPaths(farmId, animalId) {
  revalidatePath(`/f/${farmId}/animals`);
  if (animalId) revalidatePath(`/f/${farmId}/animals/${animalId}`);
  revalidatePath(`/f/${farmId}/health`);
  revalidatePath(`/f/${farmId}/transactions`);
  revalidatePath(`/f/${farmId}/dashboard`);
  revalidatePath(`/f/${farmId}/reports`);
}

// Keeps the auto-created purchase expense in sync with the animal. The note
// marker makes the row identifiable without adding a DB column or migration.
async function syncPurchaseLedger(
  client,
  { farmId, animalId, tagNo, price, purchaseDate }
) {
  const amount = Number(price);
  const hasPrice = Number.isFinite(amount) && amount > 0;
  const marker = `${PURCHASE_MARKER}${animalId}]`;

  const { data: existing, error: lookupError } = await client
    .from("transactions")
    .select("id")
    .eq("farm_id", farmId)
    .eq("animal_id", animalId)
    .eq("category_code", PURCHASE_CATEGORY)
    .like("note", `%${marker}%`)
    .is("deleted_at", null)
    .limit(1);

  if (lookupError) {
    return { error: "ক্রয় লেনদেন যাচাই করা যায়নি, আবার চেষ্টা করুন" };
  }

  const linkedId = existing?.[0]?.id ?? null;

  // Price cleared (or zero): no ledger row should remain for this purchase.
  if (!hasPrice) {
    if (!linkedId) return {};
    const { error } = await client
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", linkedId)
      .eq("farm_id", farmId)
      .is("deleted_at", null);
    if (error) {
      return { error: "ক্রয় লেনদেন বাতিল করা যায়নি, আবার চেষ্টা করুন" };
    }
    return {};
  }

  const row = {
    type: "expense",
    category_code: PURCHASE_CATEGORY,
    amount,
    date: purchaseDate || todayIso(),
    animal_id: animalId,
    note: purchaseNote(tagNo, animalId),
  };

  if (linkedId) {
    const { error } = await client
      .from("transactions")
      .update(row)
      .eq("id", linkedId)
      .eq("farm_id", farmId)
      .is("deleted_at", null);
    if (error) {
      return { error: "ক্রয় লেনদেন হালনাগাদ করা যায়নি, আবার চেষ্টা করুন" };
    }
    return {};
  }

  const { error } = await client
    .from("transactions")
    .insert({ farm_id: farmId, custom_fields: {}, ...row });
  if (error) {
    return { error: "ক্রয় লেনদেন যোগ করা যায়নি, আবার চেষ্টা করুন" };
  }
  return {};
}

// Try the admin client first, then the caller's client if the admin path fails
// at runtime (bad key, missing service role on a partial deploy, etc.).
async function syncLedgerWithFallback(fallback, context) {
  const primary = ledgerClient(fallback);
  const result = await syncPurchaseLedger(primary, context);
  if (result.error && primary !== fallback) {
    const retry = await syncPurchaseLedger(fallback, context);
    return { client: fallback, error: retry.error };
  }
  return { client: primary, error: result.error };
}

// Restores an edited animal so a failed ledger write never leaves the two
// records out of sync.
async function rollbackAnimal(client, farmId, animalId, previous) {
  if (!previous) return;
  await client
    .from("animals")
    .update({
      category_code: previous.category_code,
      tag_no: previous.tag_no,
      name: previous.name,
      gender: previous.gender,
      dob: previous.dob,
      purchase_date: previous.purchase_date,
      purchase_price: previous.purchase_price,
      status: previous.status,
      photo_url: previous.photo_url,
      custom_fields: previous.custom_fields ?? {},
    })
    .eq("id", animalId)
    .eq("farm_id", farmId)
    .is("deleted_at", null);
}

export async function createAnimalAction(_prevState, formData) {
  const parsed = animalSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { farmId } = parsed.data;
  const { supabase, user } = await requireFarmAccess(farmId);

  const { count: existingAnimals } = await supabase
    .from("animals")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .is("deleted_at", null);

  const custom = await validateCustomFields(
    formData,
    supabase,
    farmId,
    "animal"
  );
  if (custom.error) return { error: custom.error };

  const row = toRow(parsed.data, custom.value);
  const { data, error } = await supabase
    .from("animals")
    .insert({ farm_id: farmId, ...row })
    .select("id, category_code, purchase_date, dob")
    .single();

  if (error || !data) {
    return { error: "পশু যোগ করা যায়নি, আবার চেষ্টা করুন" };
  }

  // A purchase is an expense in the farm ledger. Do this before scheduling
  // health so a failed ledger write leaves no half-created animal behind.
  const { client: ledger, error: ledgerError } = await syncLedgerWithFallback(
    supabase,
    {
      farmId,
      animalId: data.id,
      tagNo: parsed.data.tagNo,
      price: row.purchase_price,
      purchaseDate: parsed.data.purchaseDate,
    }
  );
  if (ledgerError) {
    await ledger
      .from("animals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("farm_id", farmId);
    return { error: ledgerError };
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

  revalidateAnimalPaths(farmId, data.id);
  const celebration = existingAnimals === 0 ? "?first=1" : "";
  redirect(`/f/${farmId}/animals/${data.id}${celebration}`);
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

  const { data: previous } = await client
    .from("animals")
    .select(
      "category_code, tag_no, name, gender, dob, purchase_date, purchase_price, status, photo_url, custom_fields"
    )
    .eq("id", animalId)
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .maybeSingle();

  const custom = await validateCustomFields(
    formData,
    client,
    farmId,
    "animal"
  );
  if (custom.error) return { error: custom.error };

  const row = toRow(parsed.data, custom.value);
  const { error } = await client
    .from("animals")
    .update(row)
    .eq("id", animalId)
    .eq("farm_id", farmId)
    .is("deleted_at", null);

  if (error) {
    return { error: "পশু হালনাগাদ করা যায়নি" };
  }

  const { client: ledger, error: ledgerError } = await syncLedgerWithFallback(
    client,
    {
      farmId,
      animalId,
      tagNo: parsed.data.tagNo,
      price: row.purchase_price,
      purchaseDate: parsed.data.purchaseDate,
    }
  );
  if (ledgerError) {
    await rollbackAnimal(ledger, farmId, animalId, previous);
    return { error: ledgerError };
  }

  revalidateAnimalPaths(farmId, animalId);
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

  revalidateAnimalPaths(farmId, animalId);
  redirect(`/f/${farmId}/animals`);
}
