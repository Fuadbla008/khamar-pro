import { Suspense } from "react";
import { GeneralSettings } from "@/components/domain/general-settings";
import { SettingsShell } from "@/components/domain/settings-shell";
import { can } from "@/lib/auth/can";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { loadGeneralSettings } from "@/lib/settings/load";

export const metadata = { title: "সাধারণ সেটিংস — Khamar" };

export default function SettingsPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <SettingsRoute params={params} />
    </Suspense>
  );
}

async function SettingsRoute({ params }) {
  const { farmId } = await params;
  const { supabase, role, permissions } = await requireFarmAccess(farmId);
  const { farm, banglaDigits } = await loadGeneralSettings(supabase, farmId);

  return (
    <SettingsShell
      farmId={farmId}
      title="সেটিংস"
      description="খামারের তথ্য ও পছন্দসমূহ"
    >
      <GeneralSettings
        farmId={farmId}
        farm={farm}
        banglaDigits={banglaDigits}
        isOwner={role === "owner"}
        canManageSettings={can(role, permissions, "can_manage_settings")}
      />
    </SettingsShell>
  );
}
