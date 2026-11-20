import { Suspense } from "react";
import { FieldsManager } from "@/components/domain/fields-manager";
import { SettingsShell } from "@/components/domain/settings-shell";
import { can } from "@/lib/auth/can";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { CONFIGURABLE_ENTITIES } from "@/lib/settings/constants";
import { loadFieldSettings } from "@/lib/settings/load";

export const metadata = { title: "অতিরিক্ত ঘর — Khamar" };

export default function FieldsSettingsPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <FieldsSettingsRoute params={params} />
    </Suspense>
  );
}

async function FieldsSettingsRoute({ params }) {
  const { farmId } = await params;
  const { supabase, role, permissions } = await requireFarmAccess(farmId);

  const results = await Promise.all(
    CONFIGURABLE_ENTITIES.map((entity) =>
      loadFieldSettings(supabase, farmId, entity.value)
    )
  );

  const rowsByEntity = Object.fromEntries(
    CONFIGURABLE_ENTITIES.map((entity, index) => [entity.value, results[index].rows])
  );
  const totalByEntity = Object.fromEntries(
    CONFIGURABLE_ENTITIES.map((entity, index) => [entity.value, results[index].total])
  );

  return (
    <SettingsShell
      farmId={farmId}
      title="অতিরিক্ত ঘর ব্যবস্থাপনা"
      description="প্রাণী, লেনদেন, ইনভেন্টরি ও স্বাস্থ্যে আপনার নিজস্ব তথ্যের ঘর যোগ করুন"
    >
      <FieldsManager
        farmId={farmId}
        rowsByEntity={rowsByEntity}
        totalByEntity={totalByEntity}
        canManage={can(role, permissions, "can_manage_fields")}
      />
    </SettingsShell>
  );
}
