"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createFarmSchema = z.object({
  name: z.string().trim().min(2, "খামারের নাম কমপক্ষে ২ অক্ষরের হতে হবে"),
  primaryType: z.string().trim().min(1, "প্রাণীর ধরন নির্বাচন করুন"),
  address: z.string().trim().max(200, "ঠিকানা ২০০ অক্ষরের কম হতে হবে"),
});

export async function createFarmAction(_prevState, formData) {
  const parsed = createFarmSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    primaryType: String(formData.get("primaryType") ?? ""),
    address: String(formData.get("address") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: allowedTypes } = await supabase
    .from("categories")
    .select("code")
    .is("farm_id", null)
    .eq("entity", "animal")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (!allowedTypes?.some((item) => item.code === parsed.data.primaryType)) {
    return { error: "সঠিক প্রাণীর ধরন নির্বাচন করুন" };
  }

  const { data: farmId, error } = await supabase.rpc("create_farm", {
    p_name: parsed.data.name,
    p_primary_type: parsed.data.primaryType,
    p_address: parsed.data.address || null,
  });

  if (error || !farmId) {
    return { error: "খামার তৈরি করা যায়নি, আবার চেষ্টা করুন" };
  }

  redirect(`/f/${farmId}/dashboard`);
}
