import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";

export default function FarmLayout({ children, params }) {
  return (
    <Suspense
      fallback={<div className="min-h-dvh animate-pulse bg-background" />}
    >
      <FarmShell params={params}>{children}</FarmShell>
    </Suspense>
  );
}

async function FarmShell({ children, params }) {
  const { farmId } = await params;
  const { supabase, user } = await requireFarmAccess(farmId);

  const [memberships, profile] = await Promise.all([
    supabase
      .from("farm_members")
      .select("farm_id, farms(name)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("joined_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const farms = (memberships.data ?? []).map((row) => ({
    id: row.farm_id,
    name: row.farms?.name ?? "খামার",
  }));

  return (
    <AppShell farmId={farmId} farms={farms} userName={profile.data?.full_name || user.email}>
      {children}
    </AppShell>
  );
}
