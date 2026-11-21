import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  ChartNoAxesCombined,
  PawPrint,
  Scale,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/domain/empty-state";
import { ExportButton } from "@/components/domain/export-button";
import { TutorialOverlay } from "@/components/domain/tutorial-overlay";
import { KpiCard } from "@/components/domain/kpi-card";
import { TransactionRow } from "@/components/domain/transaction-row";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { getCategoryLabels } from "@/lib/categories/labels";
import { loadFarmSlug } from "@/lib/farms/context";
import { dueWindowDates } from "@/lib/health/constants";
import { banglaDigitsFromSettings } from "@/lib/settings/display";
import { formatDate, formatMoney, toBanglaDigits } from "@/lib/utils/format";

export const metadata = { title: "ড্যাশবোর্ড — Khamar" };

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DashboardPage({ params }) {
  return (
    <>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent params={params} />
      </Suspense>
      <TutorialOverlay />
    </>
  );
}

async function DashboardContent({ params }) {
  // Supabase Auth reads token expiry via Date.now(), and this route also uses
  // the current date for month filters. Defer both to request time.
  await connection();

  const { farmId } = await params;
  const { supabase } = await requireFarmAccess(farmId);

  const today = new Date();
  const monthStart = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const monthEnd = isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const dueWindow = dueWindowDates(today);

  const [
    animalsResult,
    monthResult,
    recentResult,
    categoryLabels,
    settingsResult,
    inventoryResult,
    dueResult,
    sickResult,
    farmSlug,
  ] = await Promise.all([
      supabase
        .from("animals")
        .select("id", { count: "exact", head: true })
        .eq("farm_id", farmId)
        .is("deleted_at", null),
      supabase
        .from("transactions")
        .select("type, amount")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .gte("date", monthStart)
        .lte("date", monthEnd),
      supabase
        .from("transactions")
        .select("id, type, amount, date, category_code, note")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10),
      getCategoryLabels(supabase, farmId, "transaction"),
      supabase.from("app_settings").select("key, value").eq("farm_id", farmId),
      // Missing table (migration 0010 not applied yet) is treated as no warning.
      supabase
        .from("inventory_items")
        .select("current_stock, min_stock")
        .eq("farm_id", farmId)
        .is("deleted_at", null),
      // Missing table (migration 0011 not applied yet) is treated as no reminder.
      supabase
        .from("health_records")
        .select("id, title, next_due_date, animal_id")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .gte("next_due_date", dueWindow.start)
        .lte("next_due_date", dueWindow.end)
        .order("next_due_date", { ascending: true })
        .limit(5),
      supabase
        .from("animals")
        .select("id", { count: "exact", head: true })
        .eq("farm_id", farmId)
        .eq("status", "sick")
        .is("deleted_at", null),
      loadFarmSlug(supabase, farmId),
    ]);

  const banglaDigits = banglaDigitsFromSettings(settingsResult.data);
  const lowStockCount = (inventoryResult.data ?? []).filter(
    (row) => Number(row.current_stock ?? 0) <= Number(row.min_stock ?? 0)
  ).length;
  const dueRecords = dueResult.data ?? [];
  const sickCount = sickResult.count ?? 0;

  const animalCount = animalsResult.count ?? 0;
  const monthly = monthResult.data ?? [];
  const income = monthly
    .filter((row) => row.type === "income")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const expense = monthly
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const profit = income - expense;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ড্যাশবোর্ড</h1>
          <p className="text-sm text-muted-foreground">আপনার খামারের আজকের হিসাব</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {lowStockCount ? (
              <Link
                href={`/f/${farmId}/inventory`}
                className="press inline-flex min-h-9 items-center rounded-pill border border-destructive/30 bg-destructive/10 px-3 text-xs font-semibold text-destructive"
              >
                ⚠ {banglaDigits ? toBanglaDigits(lowStockCount) : lowStockCount} টি স্টক কম
              </Link>
            ) : null}
            {sickCount ? (
              <Link
                href={`/f/${farmId}/animals?status=sick`}
                className="press inline-flex min-h-9 items-center rounded-pill border border-destructive/30 bg-destructive/10 px-3 text-xs font-semibold text-destructive"
              >
                🩺 {banglaDigits ? toBanglaDigits(sickCount) : sickCount} টি পশু অসুস্থ
              </Link>
            ) : null}
          </div>
        </div>
        <Link
          href={`/f/${farmId}/reports`}
          className="press inline-flex min-h-11 items-center gap-2 rounded-input bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <ChartNoAxesCombined className="size-4" />
          রিপোর্ট দেখুন
        </Link>
      </div>

      <section
        aria-label="মূল তথ্য"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="মোট পশু"
          value={animalCount}
          icon={PawPrint}
        />
        <KpiCard
          label="এই মাসের খরচ"
          value={formatMoney(expense, { banglaDigits })}
          tone="danger"
          icon={Wallet}
        />
        <KpiCard
          label="এই মাসের আয়"
          value={formatMoney(income, { banglaDigits })}
          tone="success"
          icon={Scale}
        />
        <KpiCard
          label="লাভ/ক্ষতি"
          value={formatMoney(profit, { banglaDigits })}
          tone={profit >= 0 ? "success" : "danger"}
          hint={profit >= 0 ? "এই মাসে লাভ" : "এই মাসে ক্ষতি"}
          icon={ChartNoAxesCombined}
        />
      </section>

      {dueRecords.length ? (
        <Card className="rounded-card shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              🔔 {banglaDigits ? toBanglaDigits(dueRecords.length) : dueRecords.length} টি টিকা বাকি
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {dueRecords.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="truncate">{row.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(row.next_due_date, { banglaDigits })}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href={`/f/${farmId}/health?filter=due`}
              className="press mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary hover:underline"
            >
              সব টিকা দেখুন
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-card shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">সাম্প্রতিক লেনদেন</CardTitle>
        </CardHeader>
        <CardContent>
          {recentResult.data?.length ? (
            <ul className="divide-y divide-border">
              {recentResult.data.map((row) => (
                <TransactionRow
                  key={row.id}
                  transaction={row}
                  categoryLabel={categoryLabels.get(row.category_code)}
                  banglaDigits={banglaDigits}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="এখনো কোনো লেনদেন নেই"
              description="প্রথম লেনদেন যোগ করলেই এখানে দেখা যাবে।"
            />
          )}
        </CardContent>
      </Card>

      <Card className="rounded-card shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">রিপোর্ট ডাউনলোড</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">খামারের সারসংক্ষেপ</p>
            <ExportButton
              farmId={farmId}
              farmSlug={farmSlug}
              entity="farm-summary"
              filename="farm_summary"
              filters={{ from: monthStart, to: monthEnd }}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">সদস্য অনুযায়ী</p>
            <ExportButton
              farmId={farmId}
              farmSlug={farmSlug}
              entity="user-wise"
              filename="user_wise"
              filters={{ from: monthStart, to: monthEnd }}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">ক্যাটাগরি অনুযায়ী</p>
            <ExportButton
              farmId={farmId}
              farmSlug={farmSlug}
              entity="category-wise"
              filename="category_wise"
              filters={{ from: monthStart, to: monthEnd }}
            />
          </div>
        </CardContent>
      </Card>

    </main>
  );
}

function DashboardSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-card bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-card bg-muted" />
    </main>
  );
}
