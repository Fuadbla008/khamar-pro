"use client";

import { useState } from "react";
import Link from "next/link";
import {
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { ExportButton } from "@/components/domain/export-button";
import { HealthTimeline } from "@/components/domain/health-timeline";
import { ResponsiveModal } from "@/components/domain/responsive-modal";
import { HealthForm } from "@/components/forms/health-form";
import { useAnimals } from "@/hooks/use-animals";
import { useBanglaDigits } from "@/hooks/use-display-settings";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import {
  useHealthMedicines,
  useHealthRecords,
  useInvalidateHealth,
} from "@/hooks/use-health";
import {
  dueWindowDates,
  HEALTH_TABS,
  HEALTH_TAB_VALUES,
} from "@/lib/health/constants";

export function HealthView({ farmId, farmSlug, definitions }) {
  const [filters, setFilters] = useQueryStates({
    tab: parseAsStringLiteral(HEALTH_TAB_VALUES).withDefault("all"),
    filter: parseAsStringLiteral(["all", "due"]).withDefault("all"),
  });
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const recordsQuery = useHealthRecords(farmId);
  const { data: animals = [] } = useAnimals(farmId);
  const { data: medicines = [] } = useHealthMedicines(farmId);
  const banglaDigits = useBanglaDigits(farmId);
  const isDesktop = useIsDesktop();
  const invalidate = useInvalidateHealth(farmId);

  const window = dueWindowDates();
  const activeTab = HEALTH_TABS.find((tab) => tab.value === filters.tab);
  const records = (recordsQuery.data ?? []).filter((record) => {
    if (activeTab?.types && !activeTab.types.includes(record.type)) return false;
    if (filters.filter === "due") {
      const due = record.next_due_date;
      if (!due || due < window.start || due > window.end) return false;
    }
    return true;
  });

  function handleDone() {
    setNewOpen(false);
    setEditing(null);
    invalidate();
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 pb-28 md:px-8 md:py-10 md:pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">স্বাস্থ্য</h1>
          <p className="text-sm text-muted-foreground">
            টিকা, চিকিৎসা ও পশুর স্বাস্থ্যের সম্পূর্ণ ইতিহাস
          </p>
          {filters.filter === "due" ? (
            <Link
              href={`/f/${farmId}/health`}
              className="mt-2 inline-flex min-h-9 items-center rounded-pill border border-destructive/30 bg-destructive/10 px-3 text-xs font-semibold text-destructive"
            >
              শুধু আসন্ন টিকা · ফিল্টার বাদ দিন
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportButton
            farmId={farmId}
            farmSlug={farmSlug}
            entity="health"
            filename="health"
            filters={{ tab: filters.tab, filter: filters.filter }}
          />
          <Button
            type="button"
            onClick={() => setNewOpen(true)}
            className="press hidden h-11 rounded-input sm:inline-flex"
          >
            <Plus className="size-4" />
            নতুন রেকর্ড
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="স্বাস্থ্যের ধরন">
        {HEALTH_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilters({ tab: tab.value })}
            className={cn(
              "press flex min-h-11 shrink-0 items-center rounded-input border px-4 text-sm font-medium",
              filters.tab === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {recordsQuery.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-card bg-muted" />
          ))}
        </div>
      ) : null}

      {recordsQuery.isError ? (
        <EmptyState
          title="স্বাস্থ্যের রেকর্ড লোড করা যায়নি"
          description="সংযোগ যাচাই করে আবার চেষ্টা করুন।"
          action={
            <Button
              variant="outline"
              className="press h-11 rounded-input"
              onClick={() => recordsQuery.refetch()}
            >
              আবার চেষ্টা করুন
            </Button>
          }
        />
      ) : null}

      {recordsQuery.isSuccess && records.length === 0 ? (
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            title="এখনো কোনো রেকর্ড নেই"
            description="নতুন রেকর্ড যোগ করে স্বাস্থ্যের ইতিহাস শুরু করুন।"
            action={
              <Button
                onClick={() => setNewOpen(true)}
                className="press h-11 rounded-input"
              >
                নতুন রেকর্ড
              </Button>
            }
          />
        </div>
      ) : null}

      {recordsQuery.isSuccess && records.length > 0 ? (
        <HealthTimeline
          records={records}
          animals={animals}
          medicines={medicines}
          banglaDigits={banglaDigits}
          onEdit={setEditing}
        />
      ) : null}

      <Button
        type="button"
        onClick={() => setNewOpen(true)}
        className="press fixed bottom-20 right-4 z-30 h-12 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg sm:hidden"
      >
        <Plus className="size-5" />
        নতুন রেকর্ড
      </Button>

      <ResponsiveModal
        open={newOpen}
        onOpenChange={setNewOpen}
        isDesktop={isDesktop}
        title="নতুন স্বাস্থ্য রেকর্ড"
        description="টিকা, ঔষধ বা পশুর অবস্থার তথ্য যোগ করুন"
      >
        <HealthForm
          key="new"
          farmId={farmId}
          definitions={definitions}
          onDone={handleDone}
        />
      </ResponsiveModal>

      {editing ? (
        <ResponsiveModal
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          isDesktop={isDesktop}
          title="রেকর্ড সম্পাদনা"
          description="নির্ধারিত রেকর্ড সম্পন্ন করতে «সম্পন্ন হয়েছে» টিক দিন"
        >
          <HealthForm
            key={editing.id}
            farmId={farmId}
            record={editing}
            definitions={definitions}
            onDone={handleDone}
          />
        </ResponsiveModal>
      ) : null}
    </main>
  );
}
