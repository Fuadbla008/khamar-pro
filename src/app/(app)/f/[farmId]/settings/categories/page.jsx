import { Suspense } from "react";
import { CategoriesManager } from "@/components/domain/categories-manager";
import { SettingsShell } from "@/components/domain/settings-shell";
import { can } from "@/lib/auth/can";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { CONFIGURABLE_ENTITIES } from "@/lib/settings/constants";
import { loadCategorySettings } from "@/lib/settings/load";

export const metadata = { title: "ক্যাটাগরি — Khamar" };

export default function CategoriesSettingsPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <CategoriesSettingsRoute params={params} />
    </Suspense>
  );
}

async function CategoriesSettingsRoute({ params }) {
  const { farmId } = await params;
  const { supabase, role, permissions } = await requireFarmAccess(farmId);

  const results = await Promise.all(
    CONFIGURABLE_ENTITIES.map((entity) =>
      loadCategorySettings(supabase, farmId, entity.value)
    )
  );

  const rowsByEntity = Object.fromEntries(
    CONFIGURABLE_ENTITIES.map((entity, index) => [entity.value, results[index]])
  );

  return (
    <SettingsShell
      farmId={farmId}
      title="ক্যাটাগরি ব্যবস্থাপনা"
      description="পশু, লেনদেন, ইনভেন্টরি, স্বাস্থ্য ও উৎপাদনের ক্যাটাগরি আপনি নিজে ঠিক করুন"
    >
      <CategoriesManager
        farmId={farmId}
        rowsByEntity={rowsByEntity}
        canManage={can(role, permissions, "can_manage_categories")}
      />
    </SettingsShell>
  );
}
