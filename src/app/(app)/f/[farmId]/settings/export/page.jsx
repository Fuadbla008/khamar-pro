import { Suspense } from "react";
import { ExportCenter } from "@/components/domain/export-center";
import { SettingsShell } from "@/components/domain/settings-shell";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { loadExportContext } from "@/lib/export/bundle-helpers";

export const metadata = { title: "ডেটা এক্সপোর্ট — Khamar" };

export default function ExportSettingsPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <ExportSettingsRoute params={params} />
    </Suspense>
  );
}

async function ExportSettingsRoute({ params }) {
  const { farmId } = await params;
  const { supabase, user, role } = await requireFarmAccess(farmId);
  const context = await loadExportContext(supabase, farmId, user, role);

  return (
    <SettingsShell
      farmId={farmId}
      title="ডেটা এক্সপোর্ট ও ব্যাকআপ"
      description="খামারের ডেটা CSV বা JSON আকারে ডাউনলোড করুন"
    >
      <ExportCenter farmId={farmId} {...context} />
    </SettingsShell>
  );
}
