import { Suspense } from "react";
import { HealthView } from "@/components/domain/health-view";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { loadHealthDefinitions } from "@/lib/fields/load";

export const metadata = { title: "স্বাস্থ্য — Khamar" };

export default function HealthPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <HealthRoute params={params} />
    </Suspense>
  );
}

async function HealthRoute({ params }) {
  const { farmId } = await params;
  const { supabase } = await requireFarmAccess(farmId);
  const definitions = await loadHealthDefinitions(supabase, farmId);

  return <HealthView farmId={farmId} definitions={definitions} />;
}
