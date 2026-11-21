import { Suspense } from "react";
import { InventoryView } from "@/components/domain/inventory-view";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { loadFarmSlug } from "@/lib/farms/context";
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
  const [definitions, farmSlug] = await Promise.all([
    loadInventoryDefinitions(supabase, farmId),
    loadFarmSlug(supabase, farmId),
  ]);

  return (
    <InventoryView farmId={farmId} farmSlug={farmSlug} definitions={definitions} />
  );
}
