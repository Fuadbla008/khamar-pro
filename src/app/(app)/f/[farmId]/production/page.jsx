import { Suspense } from "react";
import { ProductionView } from "@/components/domain/production-view";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { loadFarmSlug } from "@/lib/farms/context";
import { loadProductionDefinitions } from "@/lib/fields/load";

export const metadata = { title: "উৎপাদন — Khamar" };

export default function ProductionPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <ProductionRoute params={params} />
    </Suspense>
  );
}

async function ProductionRoute({ params }) {
  const { farmId } = await params;
  const { supabase } = await requireFarmAccess(farmId);
  const [definitions, farmSlug] = await Promise.all([
    loadProductionDefinitions(supabase, farmId),
    loadFarmSlug(supabase, farmId),
  ]);

  return (
    <ProductionView farmId={farmId} farmSlug={farmSlug} definitions={definitions} />
  );
}
