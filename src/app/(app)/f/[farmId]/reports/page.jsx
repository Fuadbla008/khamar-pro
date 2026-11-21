import { Suspense } from "react";
import { ReportsView } from "@/components/domain/reports-view";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { loadReportContext } from "@/lib/reports/query";

export const metadata = { title: "রিপোর্ট — Khamar" };

export default function ReportsPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <ReportsRoute params={params} />
    </Suspense>
  );
}

async function ReportsRoute({ params }) {
  const { farmId } = await params;
  const { supabase } = await requireFarmAccess(farmId);
  const context = await loadReportContext(supabase, farmId);

  return <ReportsView farmId={farmId} {...context} />;
}
