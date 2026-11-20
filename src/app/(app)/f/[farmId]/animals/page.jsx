import { Suspense } from "react";
import { AnimalsView } from "@/components/domain/animals-view";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";

export const metadata = { title: "পশু — Khamar" };

export default function AnimalsPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <AnimalsRoute params={params} />
    </Suspense>
  );
}

async function AnimalsRoute({ params }) {
  const { farmId } = await params;
  await requireFarmAccess(farmId);
  return <AnimalsView farmId={farmId} />;
}
