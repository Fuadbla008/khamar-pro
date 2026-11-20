import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/forms/confirm-submit";
import { deleteItemAction } from "@/lib/inventory/actions";
import { DIRECTION_LABELS } from "@/lib/inventory/constants";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { getCategoryLabels } from "@/lib/categories/labels";
import { loadInventoryDefinitions } from "@/lib/fields/load";
import { banglaDigitsFromSettings } from "@/lib/settings/display";
import {
  formatDate,
  formatMoney,
  formatQuantity,
} from "@/lib/utils/format";

export const metadata = { title: "আইটেমের বিবরণ — Khamar" };

export default function InventoryItemDetailPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <InventoryItemDetailRoute params={params} />
    </Suspense>
  );
}

function displayValue(definition, value) {
  if (value === undefined || value === null || value === "") return "—";
  if (definition.type === "boolean") return value ? "হ্যাঁ" : "না";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function DetailRow({ label, value }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value || "—"}</dd>
    </div>
  );
}

async function InventoryItemDetailRoute({ params }) {
  const { farmId, itemId } = await params;
  const { supabase } = await requireFarmAccess(farmId);

  const [itemResult, movementResult, categoryLabels, definitions, settingsResult] =
    await Promise.all([
      supabase
        .from("inventory_items")
        .select("*")
        .eq("id", itemId)
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("inventory_movements")
        .select("*")
        .eq("item_id", itemId)
        .eq("farm_id", farmId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      getCategoryLabels(supabase, farmId, "inventory"),
      loadInventoryDefinitions(supabase, farmId),
      supabase.from("app_settings").select("key, value").eq("farm_id", farmId),
    ]);

  const item = itemResult.data;
  if (!item) notFound();

  const banglaDigits = banglaDigitsFromSettings(settingsResult.data);
  const low = Number(item.current_stock) <= Number(item.min_stock);
  const totalValue = Number(item.current_stock) * Number(item.unit_price ?? 0);

  const customRows = definitions
    .map((definition) => ({
      definition,
      value: displayValue(definition, item.custom_fields?.[definition.key]),
    }))
    .filter((row) => row.value !== "—");

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <Card className="rounded-card shadow-soft">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate text-xl">{item.name_bn}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {categoryLabels.get(item.category_code) ?? item.category_code} ·{" "}
                {item.unit}
              </p>
            </div>
            {low ? (
              <Badge variant="destructive" className="shrink-0 rounded-pill">
                ⚠ কম স্টক
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-card bg-muted/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              বর্তমান স্টক
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {formatQuantity(item.current_stock, { banglaDigits })}
              <span className="ml-1 text-base font-normal text-muted-foreground">
                {item.unit}
              </span>
            </p>
          </div>

          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailRow
              label="ন্যুনতম স্টক"
              value={`${formatQuantity(item.min_stock, { banglaDigits })} ${item.unit}`}
            />
            <DetailRow
              label="একক মূল্য"
              value={
                item.unit_price
                  ? formatMoney(item.unit_price, { banglaDigits })
                  : "—"
              }
            />
            <DetailRow
              label="মোট মূল্য"
              value={
                item.unit_price
                  ? formatMoney(totalValue, { banglaDigits })
                  : "—"
              }
            />
            <DetailRow label="নাম (ইংরেজি)" value={item.name} />
          </dl>

          {customRows.length ? (
            <section className="space-y-3 border-t border-border pt-5">
              <h2 className="text-sm font-semibold">অতিরিক্ত তথ্য</h2>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {customRows.map(({ definition, value }) => (
                  <DetailRow
                    key={definition.id}
                    label={definition.label_bn || definition.label}
                    value={value}
                  />
                ))}
              </dl>
            </section>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-card shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">স্টকের ইতিহাস</CardTitle>
        </CardHeader>
        <CardContent>
          {movementResult.data?.length ? (
            <ul className="divide-y divide-border">
              {movementResult.data.map((movement) => (
                <li
                  key={movement.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {movement.direction === "in" ? "+" : "−"}{" "}
                      {formatQuantity(movement.qty, { banglaDigits })}{" "}
                      {item.unit}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {DIRECTION_LABELS[movement.direction]}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatDate(movement.date, { banglaDigits })}
                      {movement.note ? ` · ${movement.note}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">
                    {movement.total_cost
                      ? formatMoney(movement.total_cost, { banglaDigits })
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              এখনো কোনো স্টক পরিবর্তন নেই।
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="press h-11 rounded-input">
          <Link href={`/f/${farmId}/inventory/${itemId}/edit`}>
            সম্পাদনা করুন
          </Link>
        </Button>
        <Button asChild variant="outline" className="press h-11 rounded-input">
          <Link href={`/f/${farmId}/inventory`}>তালিকায় ফিরুন</Link>
        </Button>
        <form action={deleteItemAction}>
          <input type="hidden" name="farmId" value={farmId} />
          <input type="hidden" name="itemId" value={item.id} />
          <ConfirmSubmit
            label="আইটেম মুছুন"
            confirmText={`${item.name_bn} কে মুছে ফেলতে চান?`}
          />
        </form>
      </div>
    </main>
  );
}
