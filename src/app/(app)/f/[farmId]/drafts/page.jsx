import { Suspense } from "react";
import { DraftsView } from "@/components/domain/drafts-view";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";

export const metadata = { title: "ড্রাফট — Khamar" };

export default function DraftsPage({ params }) {
  return (
    <Suspense
      fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}
    >
      <DraftsRoute params={params} />
    </Suspense>
  );
}

async function DraftsRoute({ params }) {
  const { farmId } = await params;
  await requireFarmAccess(farmId);

  return <DraftsView farmId={farmId} />;
}
