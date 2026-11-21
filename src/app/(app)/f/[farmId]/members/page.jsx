import { Suspense } from "react";
import { MembersView } from "@/components/domain/members-view";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { loadFarmSlug } from "@/lib/farms/context";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "সদস্য — Khamar" };

export default function MembersPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <MembersRoute params={params} />
    </Suspense>
  );
}

async function MembersRoute({ params }) {
  const { farmId } = await params;
  const { supabase, user, role, permissions } = await requireFarmAccess(farmId);

  const [membersResult, expensesResult, invitesResult, joinResult, farmSlug] =
    await Promise.all([
      supabase
        .from("farm_members")
        .select(
          "id, user_id, role, permissions, joined_at, profiles(full_name, phone)"
        )
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .order("joined_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("paid_by")
        .eq("farm_id", farmId)
        .eq("type", "expense")
        .is("deleted_at", null),
      supabase
        .from("farm_invites")
        .select("*")
        .eq("farm_id", farmId)
        .order("created_at", { ascending: false }),
      supabase
        .from("farm_members")
        .select(
          "id, invite_id, joined_at, profiles(full_name), farm_invites(code)"
        )
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .not("invite_id", "is", null)
        .order("joined_at", { ascending: false }),
      loadFarmSlug(supabase, farmId),
    ]);

  const expenseCounts = {};
  for (const row of expensesResult.data ?? []) {
    if (!row.paid_by) continue;
    expenseCounts[row.paid_by] = (expenseCounts[row.paid_by] ?? 0) + 1;
  }

  const members = (membersResult.data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    role: row.role,
    permissions: row.permissions ?? {},
    joined_at: row.joined_at,
    full_name: row.profiles?.full_name || "সদস্য",
    phone: row.profiles?.phone || "",
    expense_count: expenseCounts[row.user_id] ?? 0,
    last_sign_in_at: null,
  }));

  // "Last seen" comes from Supabase Auth. It is optional: the page still works
  // when the service-role key is not configured.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const seen = await Promise.all(
        members.map(async (member) => {
          try {
            const { data } = await admin.auth.admin.getUserById(member.user_id);
            return [member.user_id, data?.user?.last_sign_in_at ?? null];
          } catch {
            return [member.user_id, null];
          }
        })
      );
      const seenMap = Object.fromEntries(seen);
      for (const member of members) {
        member.last_sign_in_at = seenMap[member.user_id];
      }
    } catch {
      // Auth admin unavailable; leave the column blank.
    }
  }

  const joinLog = (joinResult.data ?? []).map((row) => ({
    member_id: row.id,
    invite_id: row.invite_id,
    invite_code: row.farm_invites?.code ?? "",
    full_name: row.profiles?.full_name || "সদস্য",
    joined_at: row.joined_at,
  }));

  return (
    <MembersView
      farmId={farmId}
      farmSlug={farmSlug}
      members={members}
      invites={invitesResult.data ?? []}
      joinLog={joinLog}
      currentUserId={user.id}
      isOwner={role === "owner"}
      canManageMembers={Boolean(permissions.can_manage_members)}
    />
  );
}
