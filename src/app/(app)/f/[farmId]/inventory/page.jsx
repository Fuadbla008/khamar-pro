import { Suspense } from "react";
import { InventoryView } from "@/components/domain/inventory-view";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { loadInventoryDefinitions } from "@/lib/fields/load";

export const metadata = { title: "ইনভেন্টরি — Khamar" };

export default function InventoryPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <InventoryRoute params={params} />
    </Suspense>
  );
}

async function InventoryRoute({ params }) {
  const { farmId } = await params;
  const { supabase } = await requireFarmAccess(farmId);
  const definitions = await loadInventoryDefinitions(supabase, farmId);

  return <InventoryView farmId={farmId} definitions={definitions} />;
}
