"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { ExternalLink, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/domain/empty-state";
import { ExportButton } from "@/components/domain/export-button";
import { ResponsiveModal } from "@/components/domain/responsive-modal";
import { ProductionForm } from "@/components/forms/production-form";
import { useAnimals } from "@/hooks/use-animals";
import { useBanglaDigits } from "@/hooks/use-display-settings";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import {
  useInvalidateProduction,
  useProductionRecords,
  useSoftDeleteProduction,
} from "@/hooks/use-production";
import {
  PRODUCTION_TABS,
  PRODUCTION_TAB_VALUES,
  PRODUCTION_TYPE_LABELS,
} from "@/lib/production/constants";
import { sumDecimal } from "@/lib/utils/decimal";
import {
  formatDate,
  formatMoney,
  formatQuantity,
  toBanglaDigits,
} from "@/lib/utils/format";

function sourceHref(record) {
  const id = record.linked_transaction_id;
  const params = new URLSearchParams({
    from: record.date,
    to: record.date,
    ...(id ? { id } : {}),
  });
  return `/f/${record.farm_id}/transactions?${params.toString()}`;
}

export function ProductionView({ farmId, farmSlug, definitions }) {
  const [filters] = useQueryStates({
    tab: parseAsStringLiteral(PRODUCTION_TAB_VALUES).withDefault("all"),
  });
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const recordsQuery = useProductionRecords(farmId, filters.tab);
  const { data: animals = [] } = useAnimals(farmId);
  const deleteMutation = useSoftDeleteProduction(farmId);
  const invalidate = useInvalidateProduction(farmId);
  const banglaDigits = useBanglaDigits(farmId);
  const isDesktop = useIsDesktop();

  const records = recordsQuery.data ?? [];
  const totalIncome = sumDecimal(records.map((row) => row.total_income));
  const tagOf = (id) => animals.find((animal) => animal.id === id)?.tag_no ?? "";

  const groups = [];
  for (const record of records) {
    const last = groups[groups.length - 1];
    if (last && last.date === record.date) last.items.push(record);
    else groups.push({ date: record.date, items: [record] });
  }

  function handleDone() {
    setNewOpen(false);
    setEditing(null);
    invalidate();
  }

  function handleDelete(record) {
    if (!window.confirm("এই উৎপাদন রেকর্ডটি মুছে ফেলতে চান?")) return;
    deleteMutation.mutate(record.id);
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 pb-28 md:px-8 md:py-10 md:pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">উৎপাদন</h1>
          <p className="text-sm text-muted-foreground">
            দুধ, ডিম, মাংস ও অন্যান্য উৎপাদনের দৈনিক হিসাব
          </p>
          {records.length ? (
            <p className="mt-2 text-sm font-semibold text-success">
              নির্বাচিত মোট আয় {formatMoney(totalIncome, { banglaDigits })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportButton
            farmId={farmId}
            farmSlug={farmSlug}
            entity="production"
            filename="production"
            filters={{ type: filters.tab }}
          />
          <Button
            type="button"
            onClick={() => setNewOpen(true)}
            className="press hidden h-11 rounded-input sm:inline-flex"
          >
            <Plus className="size-4" />
            নতুন উৎপাদন
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="উৎপাদনের ধরন">
        {PRODUCTION_TABS.map((tab) => (
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
          title="উৎপাদন লোড করা যায়নি"
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
            title="এখনো কোনো উৎপাদন নেই"
            description="প্রথম উৎপাদন রেকর্ড যোগ করে হিসাব শুরু করুন।"
            action={
              <Button
                onClick={() => setNewOpen(true)}
                className="press h-11 rounded-input"
              >
                নতুন উৎপাদন
              </Button>
            }
          />
        </div>
      ) : null}

      {recordsQuery.isSuccess && records.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.date}
              className="overflow-hidden rounded-card border border-border bg-card shadow-soft"
            >
              <div className="flex items-center justify-between bg-muted/60 px-4 py-2">
                <h2 className="text-sm font-semibold">
                  {formatDate(group.date, { banglaDigits })}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {banglaDigits
                    ? toBanglaDigits(group.items.length)
                    : group.items.length}{" "}
                  টি এন্ট্রি
                </span>
              </div>

              <ul className="divide-y divide-border md:hidden">
                {group.items.map((record) => (
                  <li key={record.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {PRODUCTION_TYPE_LABELS[record.type] ?? record.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.animal_id
                            ? tagOf(record.animal_id) || "পশু"
                            : "পুরো দল"}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(record.total_income, { banglaDigits })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="tabular-nums">
                        {formatQuantity(record.qty, { banglaDigits })} {record.unit}
                        {record.price_per_unit
                          ? ` · ${formatMoney(record.price_per_unit, { banglaDigits })}/${record.unit}`
                          : ""}
                      </span>
                      <div className="flex items-center gap-1">
                        {record.linked_transaction_id ? (
                          <Button asChild variant="ghost" size="sm" className="press min-h-11 px-2">
                            <Link href={sourceHref(record)}>
                              <ExternalLink className="size-4" />
                              উৎস
                            </Link>
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(record)}
                          className="press min-h-11"
                        >
                          সম্পাদনা
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record)}
                          className="press min-h-11 text-destructive"
                        >
                          মুছুন
                        </Button>
                      </div>
                    </div>
                    {record.notes ? (
                      <p className="text-xs text-muted-foreground">{record.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ধরন</TableHead>
                      <TableHead>পশু</TableHead>
                      <TableHead className="text-right">পরিমাণ</TableHead>
                      <TableHead className="text-right">একক মূল্য</TableHead>
                      <TableHead className="text-right">মোট আয়</TableHead>
                      <TableHead>উৎস</TableHead>
                      <TableHead className="text-right">কাজ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {PRODUCTION_TYPE_LABELS[record.type] ?? record.type}
                        </TableCell>
                        <TableCell>
                          {record.animal_id
                            ? tagOf(record.animal_id) || "পশু"
                            : "পুরো দল"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantity(record.qty, { banglaDigits })} {record.unit}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {record.price_per_unit
                            ? formatMoney(record.price_per_unit, { banglaDigits })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatMoney(record.total_income, { banglaDigits })}
                        </TableCell>
                        <TableCell>
                          {record.linked_transaction_id ? (
                            <Link
                              href={sourceHref(record)}
                              className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              <ExternalLink className="size-3.5" />
                              লেনদেন দেখুন
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(record)}
                              className="press min-h-11"
                            >
                              সম্পাদনা
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record)}
                              className="press min-h-11 text-destructive"
                            >
                              মুছুন
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => setNewOpen(true)}
        className="press fixed bottom-20 right-4 z-30 h-12 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg sm:hidden"
      >
        <Plus className="size-5" />
        নতুন উৎপাদন
      </Button>

      <ResponsiveModal
        open={newOpen}
        onOpenChange={setNewOpen}
        isDesktop={isDesktop}
        title="নতুন উৎপাদন"
        description="উৎপাদনের তথ্য ও অতিরিক্ত ঘর পূরণ করুন"
      >
        <ProductionForm
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
          title="উৎপাদন সম্পাদনা"
          description="পরিমাণ, মূল্য বা আয়ের সংযোগ বদলান"
        >
          <ProductionForm
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
