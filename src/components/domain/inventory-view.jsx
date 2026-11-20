"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAsString, useQueryStates } from "nuqs";
import { Plus } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/domain/empty-state";
import { ResponsiveModal } from "@/components/domain/responsive-modal";
import { InventoryCard, isLowStock } from "@/components/domain/inventory-card";
import { MovementForm } from "@/components/domain/movement-form";
import { InventoryForm } from "@/components/forms/inventory-form";
import { useBanglaDigits } from "@/hooks/use-display-settings";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useCategories } from "@/hooks/use-categories";
import {
  useInvalidateInventory,
  useInventoryItems,
} from "@/hooks/use-inventory";
import { formatMoney, formatQuantity, toBanglaDigits } from "@/lib/utils/format";

function exportCsv(items, categories) {
  // Phase 5 will replace this with the shared export engine.
  const labelOf = (code) =>
    categories.find((category) => category.code === code)?.name_bn ?? code;
  const rows = items.map((item) => ({
    নাম: item.name_bn,
    ক্যাটাগরি: labelOf(item.category_code),
    একক: item.unit,
    বর্তমান_স্টক: item.current_stock,
    ন্যুনতম_স্টক: item.min_stock,
    একক_মূল্য: item.unit_price ?? "",
    মোট_মূল্য: Number(item.current_stock ?? 0) * Number(item.unit_price ?? 0),
  }));
  console.log("CSV export (Phase 5):", rows);
}

export function InventoryView({ farmId, definitions }) {
  const [filters, setFilters] = useQueryStates({
    category: parseAsString.withDefault("all"),
  });
  const [movement, setMovement] = useState(null);
  const [newOpen, setNewOpen] = useState(false);

  const { data: categories = [] } = useCategories(farmId, "inventory");
  const inventoryQuery = useInventoryItems(farmId, filters.category);
  const invalidate = useInvalidateInventory(farmId);
  const isDesktop = useIsDesktop();
  const banglaDigits = useBanglaDigits(farmId);

  const items = inventoryQuery.data ?? [];
  const lowCount = items.filter(isLowStock).length;
  const labelOf = (code) =>
    categories.find((category) => category.code === code)?.name_bn ?? code;

  const groups = [];
  for (const item of items) {
    let group = groups.find((entry) => entry.code === item.category_code);
    if (!group) {
      group = { code: item.category_code, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  function openMovement(item, direction) {
    setMovement({ item, direction });
  }

  function handleMovementDone() {
    setMovement(null);
    invalidate();
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 pb-28 md:px-8 md:py-10 md:pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ইনভেন্টরি</h1>
          <p className="text-sm text-muted-foreground">
            খামারের খাবার, ঔষধ ও সরঞ্জামের স্টক
          </p>
          {lowCount ? (
            <Badge variant="destructive" className="mt-2 rounded-pill">
              ⚠ {banglaDigits ? toBanglaDigits(lowCount) : lowCount} টি স্টক কম
            </Badge>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => exportCsv(items, categories)}
            className="press h-11 rounded-input"
          >
            CSV
          </Button>
          <Button
            type="button"
            onClick={() => setNewOpen(true)}
            className="press hidden h-11 rounded-input sm:inline-flex"
          >
            + নতুন আইটেম
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="ক্যাটাগরি">
        <button
          type="button"
          onClick={() => setFilters({ category: "all" })}
          className={cn(
            "press flex min-h-11 shrink-0 items-center rounded-input border px-4 text-sm font-medium",
            filters.category === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground"
          )}
        >
          সব
        </button>
        {/* Global seed includes feed (খাবার); the owner can add more via Settings. */}
        {categories.map((category) => (
          <button
            key={category.code}
            type="button"
            onClick={() => setFilters({ category: category.code })}
            className={cn(
              "press flex min-h-11 shrink-0 items-center rounded-input border px-4 text-sm font-medium",
              filters.category === category.code
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            {category.icon ? <span className="mr-1.5">{category.icon}</span> : null}
            {category.name_bn}
          </button>
        ))}
      </div>

      {inventoryQuery.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32 rounded-card" />
          ))}
        </div>
      ) : null}

      {inventoryQuery.isError ? (
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            title="ইনভেন্টরি লোড করা যায়নি"
            description="সংযোগ যাচাই করে আবার চেষ্টা করুন।"
            action={
              <Button
                variant="outline"
                className="press h-11 rounded-input"
                onClick={() => inventoryQuery.refetch()}
              >
                আবার চেষ্টা করুন
              </Button>
            }
          />
        </div>
      ) : null}

      {inventoryQuery.isSuccess && items.length === 0 ? (
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            title="এখনো কোনো আইটেম নেই"
            description="প্রথম আইটেমটি যোগ করে স্টক রাখা শুরু করুন।"
            action={
              <Button
                onClick={() => setNewOpen(true)}
                className="press h-11 rounded-input"
              >
                আইটেম যোগ করুন
              </Button>
            }
          />
        </div>
      ) : null}

      {inventoryQuery.isSuccess && items.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.code} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">
                  {labelOf(group.code)}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {banglaDigits
                    ? toBanglaDigits(group.items.length)
                    : group.items.length}{" "}
                  টি আইটেম
                </span>
              </div>

              <ul className="grid gap-3 md:hidden">
                {group.items.map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    categoryLabel={labelOf(item.category_code)}
                    onAdd={() => openMovement(item, "in")}
                    onUse={() => openMovement(item, "out")}
                    banglaDigits={banglaDigits}
                  />
                ))}
              </ul>

              <div className="hidden overflow-hidden rounded-card border border-border bg-card shadow-soft md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>নাম</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead className="text-right">বর্তমান</TableHead>
                      <TableHead className="text-right">ন্যুনতম</TableHead>
                      <TableHead className="text-right">একক মূল্য</TableHead>
                      <TableHead className="text-right">মোট মূল্য</TableHead>
                      <TableHead className="text-right">কাজ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item) => {
                      const low = isLowStock(item);
                      const totalValue =
                        Number(item.current_stock ?? 0) *
                        Number(item.unit_price ?? 0);
                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            low && "border-l-4 border-l-destructive bg-destructive/5"
                          )}
                        >
                          <TableCell className="font-medium">
                            <Link
                              href={`/f/${farmId}/inventory/${item.id}`}
                              className="hover:underline"
                            >
                              {item.name_bn}
                            </Link>
                            <span className="block text-xs text-muted-foreground">
                              {item.unit}
                            </span>
                            {low ? (
                              <Badge
                                variant="destructive"
                                className="mt-1 rounded-pill"
                              >
                                ⚠ কম স্টক
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell>{labelOf(item.category_code)}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatQuantity(item.current_stock, { banglaDigits })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatQuantity(item.min_stock, { banglaDigits })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.unit_price
                              ? formatMoney(item.unit_price, { banglaDigits })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.unit_price
                              ? formatMoney(totalValue, { banglaDigits })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openMovement(item, "in")}
                                className="press min-h-11"
                              >
                                + যোগ
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openMovement(item, "out")}
                                className="press min-h-11"
                              >
                                − ব্যবহার
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <Link
        href={`/f/${farmId}/inventory/new`}
        onClick={() => setNewOpen(false)}
        className="press fixed bottom-20 right-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg md:hidden"
      >
        <Plus className="size-5" />
        নতুন আইটেম
      </Link>

      <ResponsiveModal
        open={newOpen}
        onOpenChange={setNewOpen}
        isDesktop={isDesktop}
        title="নতুন আইটেম"
        description="আইটেমের তথ্য ও প্রয়োজনীয় অতিরিক্ত ঘর পূরণ করুন"
      >
        <InventoryForm farmId={farmId} definitions={definitions} />
      </ResponsiveModal>

      {movement ? (
        <ResponsiveModal
          open={Boolean(movement)}
          onOpenChange={(open) => {
            if (!open) setMovement(null);
          }}
          isDesktop={isDesktop}
          title={
            movement.direction === "in"
              ? "স্টকে যোগ করুন"
              : "স্টক ব্যবহার করুন"
          }
          description={`${movement.item.name_bn} · ${movement.item.unit}`}
        >
          <MovementForm
            key={`${movement.item.id}-${movement.direction}`}
            farmId={farmId}
            item={movement.item}
            direction={movement.direction}
            onDone={handleMovementDone}
          />
        </ResponsiveModal>
      ) : null}
    </main>
  );
}
