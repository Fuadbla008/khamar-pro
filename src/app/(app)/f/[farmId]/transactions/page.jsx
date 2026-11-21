import { Suspense } from "react";
import { TransactionsView } from "@/components/domain/transactions-view";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { loadFarmSlug } from "@/lib/farms/context";
import { loadTransactionDefinitions } from "@/lib/fields/load";

export const metadata = { title: "লেনদেন — Khamar" };

export default function TransactionsPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <TransactionsRoute params={params} />
    </Suspense>
  );
}

async function TransactionsRoute({ params }) {
  const { farmId } = await params;
  const { supabase } = await requireFarmAccess(farmId);

  const [definitions, membersResult, animalsResult, farmSlug] = await Promise.all([
    loadTransactionDefinitions(supabase, farmId),
    supabase
      .from("farm_members")
      .select("user_id, profiles(full_name)")
      .eq("farm_id", farmId)
      .is("deleted_at", null),
    supabase
      .from("animals")
      .select("id, tag_no, name")
      .eq("farm_id", farmId)
      .is("deleted_at", null)
      .order("tag_no", { ascending: true }),
    loadFarmSlug(supabase, farmId),
  ]);

  const members = (membersResult.data ?? []).map((row) => ({
    user_id: row.user_id,
    full_name: row.profiles?.full_name || "সদস্য",
  }));

  return (
    <TransactionsView
      farmId={farmId}
      farmSlug={farmSlug}
      definitions={definitions}
      members={members}
      animals={animalsResult.data ?? []}
    />
  );
}
