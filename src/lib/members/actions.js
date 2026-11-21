"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { permissionsFromFormData } from "@/lib/members/constants";
import { createClient } from "@/lib/supabase/server";

const assignableRole = z.enum(["manager", "member"]);

const inviteSchema = z.object({
  farmId: z.uuid(),
  role: assignableRole,
  maxUses: z.coerce.number().int().min(1).max(50),
  expiresInDays: z.coerce.number().int().min(1).max(30),
});

const memberSchema = z.object({
  farmId: z.uuid(),
  memberId: z.uuid(),
  role: assignableRole,
});

function revalidateMembers(farmId) {
  revalidatePath(`/f/${farmId}/members`);
}

export async function createInviteAction(_prevState, formData) {
  const parsed = inviteSchema.safeParse({
    farmId: String(formData.get("farmId") ?? ""),
    role: String(formData.get("role") ?? "member"),
    maxUses: String(formData.get("maxUses") ?? "1"),
    expiresInDays: String(formData.get("expiresInDays") ?? "7"),
  });

  if (!parsed.success) {
    return { error: "ইনভাইটের তথ্য সঠিক নয়" };
  }

  const { supabase } = await requireFarmAccess(parsed.data.farmId);

  const { data, error } = await supabase.rpc("create_invite", {
    p_farm_id: parsed.data.farmId,
    p_role: parsed.data.role,
    p_permissions: permissionsFromFormData(formData),
    p_max_uses: parsed.data.maxUses,
    p_expires_in_days: parsed.data.expiresInDays,
  });

  if (error || !data) {
    return { error: "ইনভাইট কোড তৈরি করা যায়নি" };
  }

  revalidateMembers(parsed.data.farmId);
  return { ok: true, invite: Array.isArray(data) ? data[0] : data };
}

export async function updateMemberAction(_prevState, formData) {
  const parsed = memberSchema.safeParse({
    farmId: String(formData.get("farmId") ?? ""),
    memberId: String(formData.get("memberId") ?? ""),
    role: String(formData.get("role") ?? "member"),
  });

  if (!parsed.success) {
    return { error: "সদস্যের তথ্য সঠিক নয়" };
  }

  const { farmId, memberId, role } = parsed.data;
  const { supabase, user, role: callerRole } = await requireFarmAccess(farmId);

  if (callerRole !== "owner") {
    return { error: "শুধু মালিকই ভূমিকা বদলাতে পারেন" };
  }

  // Guard against crafted requests that skip the UI's canEdit check.
  const { data: callerMembership } = await supabase
    .from("farm_members")
    .select("id")
    .eq("farm_id", farmId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!callerMembership || callerMembership.id === memberId) {
    return { error: "নিজের সদস্যপদ বদলানো যাবে না" };
  }

  const { data: target } = await supabase
    .from("farm_members")
    .select("role")
    .eq("id", memberId)
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!target) {
    return { error: "সদস্যকে পাওয়া যায়নি" };
  }

  if (target.role === "owner") {
    return { error: "মালিকের ভূমিকা বদলানো যাবে না" };
  }

  const { error } = await supabase
    .from("farm_members")
    .update({ role, permissions: permissionsFromFormData(formData) })
    .eq("id", memberId)
    .eq("farm_id", farmId)
    .is("deleted_at", null);

  if (error) {
    return { error: "সদস্য হালনাগাদ করা যায়নি" };
  }

  revalidateMembers(farmId);
  return { ok: true };
}

export async function revokeInviteAction(formData) {
  const farmId = String(formData.get("farmId") ?? "");
  const inviteId = String(formData.get("inviteId") ?? "");

  const { supabase, role } = await requireFarmAccess(farmId);
  if (role !== "owner") return;

  await supabase
    .from("farm_invites")
    .update({ is_active: false })
    .eq("id", inviteId)
    .eq("farm_id", farmId);

  revalidateMembers(farmId);
}

export async function removeMemberAction(formData) {
  const farmId = String(formData.get("farmId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  const { supabase, role } = await requireFarmAccess(farmId);
  if (role !== "owner") return;

  await supabase
    .from("farm_members")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("farm_id", farmId);

  revalidateMembers(farmId);
}

export async function leaveFarmAction(formData) {
  const farmId = String(formData.get("farmId") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.rpc("leave_farm", { p_farm_id: farmId });

  if (error) {
    redirect(`/f/${farmId}/members?error=leave-failed`);
  }

  redirect("/");
}
