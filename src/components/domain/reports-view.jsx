"use client";

import { useState } from "react";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import {
  ChartNoAxesCombined,
  ReceiptText,
  Scale,
  Wallet,
} from "lucide-react";
import { cn } from "cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/domain/empty-state";
import { ExportButton } from "@/components/domain/export-button";
import { KpiCard } from "@/components/domain/kpi-card";
import { ReportsFilterBar } from "@/components/domain/reports-filter-bar";
import { ExpensePieChart, MonthlyBarChart } from "@/components/domain/reports-charts";
import {
  AnimalWiseTable,
  CategoryWiseTable,
  DetailTable,
  summaryExportData,
  UserWiseTable,
} from "@/components/domain/reports-tables";
import { useBanglaDigits } from "@/hooks/use-display-settings";
import {
  useAnimalWiseReport,
  useCategoryWiseReport,
  useReportSummary,
  useTransactionDetail,
  useUserWiseReport,
} from "@/hooks/use-reports";
import {
  dateRangeForPreset,
  DATE_PRESET_VALUES,
  reportMeta,
  reportTab,
  REPORT_TABS,
  REPORT_TAB_VALUES,
} from "@/lib/reports/constants";
import { formatMoney } from "@/lib/utils/format";

export function ReportsView({ farmId, farmName, farmSlug, categories, members, animals }) {
  const [filters, setFilters] = useQueryStates({
    tab: parseAsStringLiteral(REPORT_TAB_VALUES).withDefault("summary"),
    preset: parseAsStringLiteral(DATE_PRESET_VALUES).withDefault("this_month"),
    from: parseAsString.withDefault(""),
    to: parseAsString.withDefault(""),
    paidBy: parseAsArrayOf(parseAsString).withDefault([]),
    categories: parseAsArrayOf(parseAsString).withDefault([]),
    animalIds: parseAsArrayOf(parseAsString).withDefault([]),
  });

  const banglaDigits = useBanglaDigits(farmId);
  const [userExpanded, setUserExpanded] = useState(null);
  const [animalExpanded, setAnimalExpanded] = useState(null);
  const derived = dateRangeForPreset(filters.preset);
  const range = {
    from: filters.from || (filters.preset === "custom" ? "" : derived.from),
    to: filters.to || (filters.preset === "custom" ? "" : derived.to),
  };
  const reportFilters = {
    from: range.from,
    to: range.to,
    paidBy: filters.paidBy,
    categories: filters.categories,
    animalIds: filters.animalIds,
  };

  const tab = filters.tab;
  const summaryQuery = useReportSummary(farmId, reportFilters, tab === "summary");
  const userQuery = useUserWiseReport(farmId, reportFilters, tab === "userwise");
  const animalQuery = useAnimalWiseReport(farmId, reportFilters, tab === "animalwise");
  const categoryQuery = useCategoryWiseReport(farmId, reportFilters, tab === "categorywise");
  const detailQuery = useTransactionDetail(farmId, reportFilters, tab === "detail");

  const activeTab = reportTab(tab);
  const meta = reportMeta({
    label: activeTab.label,
    from: range.from,
    to: range.to,
    farmName,
  });
  const exportFilters = reportFilters;
  const visible = visibleData(
    tab,
    {
      summary: summaryQuery.data,
      userwise: userQuery.data,
      animalwise: animalQuery.data,
      categorywise: categoryQuery.data,
      detail: detailQuery.data,
    },
    banglaDigits
  );

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 pb-28 md:px-8 md:py-10 md:pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">রিপোর্ট</h1>
          <p className="text-sm text-muted-foreground">
            আয়, খরচ ও খামারের হিসাব এক জায়গায়
          </p>
        </div>
        <ExportButton
          farmId={farmId}
          farmSlug={farmSlug}
          entity={activeTab.entity}
          filename={activeTab.filename}
          filters={exportFilters}
          meta={meta}
          modes={["current"]}
          data={visible}
          label="এই রিপোর্টের CSV"
          disabled={!visible}
        />
      </div>

      <ReportsFilterBar
        filters={filters}
        setFilters={setFilters}
        categories={categories}
        members={members}
        animals={animals}
      />

      <div
        role="tablist"
        aria-label="রিপোর্টের ধরন"
        className="flex gap-1.5 overflow-x-auto pb-1"
      >
        {REPORT_TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setFilters({ tab: item.value })}
            className={cn(
              "press min-h-10 shrink-0 rounded-pill border px-4 text-sm font-semibold",
              tab === item.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        <SummaryPanel query={summaryQuery} banglaDigits={banglaDigits} />
      ) : null}
      {tab === "userwise" ? (
        <UserWiseTable
          rows={userQuery.data}
          banglaDigits={banglaDigits}
          farmId={farmId}
          farmSlug={farmSlug}
          meta={meta}
          filters={exportFilters}
          expanded={userExpanded}
          setExpanded={setUserExpanded}
        />
      ) : null}
      {tab === "animalwise" ? (
        <AnimalWiseTable
          rows={animalQuery.data}
          banglaDigits={banglaDigits}
          farmId={farmId}
          farmSlug={farmSlug}
          meta={meta}
          filters={exportFilters}
          expanded={animalExpanded}
          setExpanded={setAnimalExpanded}
        />
      ) : null}
      {tab === "categorywise" ? (
        <CategoryWiseTable
          data={categoryQuery.data ?? { income: [], expense: [] }}
          banglaDigits={banglaDigits}
          farmId={farmId}
          farmSlug={farmSlug}
          meta={meta}
          filters={exportFilters}
        />
      ) : null}
      {tab === "detail" ? (
        <DetailTable
          rows={detailQuery.data}
          banglaDigits={banglaDigits}
          farmId={farmId}
          farmSlug={farmSlug}
          meta={meta}
          filters={exportFilters}
        />
      ) : null}
    </main>
  );
}

function visibleData(tab, data, banglaDigits) {
  switch (tab) {
    case "summary":
      return data.summary ? summaryExportData(data.summary, banglaDigits) : null;
    case "userwise":
      return data.userwise
        ? { columns: summaryColumns.userwise, rows: data.userwise }
        : null;
    case "animalwise":
      return data.animalwise
        ? { columns: summaryColumns.animalwise, rows: data.animalwise }
        : null;
    case "categorywise":
      return data.categorywise
        ? { columns: summaryColumns.categorywise, rows: [
            ...data.categorywise.income.map((item) => ({ ...item, type: "আয়" })),
            ...data.categorywise.expense.map((item) => ({ ...item, type: "খরচ" })),
          ] }
        : null;
    case "detail":
      return data.detail
        ? { columns: summaryColumns.detail, rows: data.detail }
        : null;
    default:
      return null;
  }
}

// Kept here so the header export and each tab's own export always agree.
const summaryColumns = {
  userwise: [
    { key: "name", label: "সদস্যের নাম", format: "text" },
    { key: "expenseCount", label: "মোট খরচ এন্ট্রি", format: "number" },
    { key: "incomeCount", label: "মোট আয় এন্ট্রি", format: "number" },
    { key: "expense", label: "কত টাকা খরচ (৳)", format: "money" },
    { key: "income", label: "কত টাকা আয় (৳)", format: "money" },
    { key: "balance", label: "ব্যালেন্স (৳)", format: "money" },
  ],
  animalwise: [
    { key: "tagNo", label: "ট্যাগ নম্বর", format: "text" },
    { key: "name", label: "নাম", format: "text" },
    { key: "category", label: "ক্যাটাগরি", format: "text" },
    { key: "expense", label: "মোট খরচ (৳)", format: "money" },
    { key: "income", label: "মোট আয় (৳)", format: "money" },
    { key: "net", label: "লাভ/ক্ষতি (৳)", format: "money" },
  ],
  categorywise: [
    { key: "type", label: "ধরন", format: "text" },
    { key: "category", label: "ক্যাটাগরি", format: "text" },
    { key: "amount", label: "অর্থ (৳)", format: "money" },
    { key: "percent", label: "শতাংশ", format: "number" },
  ],
  detail: [
    { key: "date", label: "তারিখ", format: "date" },
    { key: "typeLabel", label: "ধরন", format: "text" },
    { key: "category", label: "ক্যাটাগরি", format: "text" },
    { key: "paidBy", label: "সদস্য", format: "text" },
    { key: "animal", label: "পশু", format: "text" },
    { key: "amount", label: "অর্থ (৳)", format: "money" },
    { key: "note", label: "নোট", format: "text" },
  ],
};

function SummaryPanel({ query, banglaDigits }) {
  const summary = query.data;
  if (query.isPending) return <ReportSkeleton />;
  if (query.isError || !summary) {
    return <EmptyState title="রিপোর্ট লোড করা যায়নি" description="আবার চেষ্টা করুন।" />;
  }

  return (
    <div className="space-y-4">
      <section
        aria-label="মূল তথ্য"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard label="মোট আয়" value={formatMoney(summary.income, { banglaDigits })} tone="success" icon={Scale} />
        <KpiCard label="মোট খরচ" value={formatMoney(summary.expense, { banglaDigits })} tone="danger" icon={Wallet} />
        <KpiCard
          label="লাভ/ক্ষতি"
          value={formatMoney(summary.net, { banglaDigits })}
          tone={summary.net.startsWith("-") ? "danger" : "success"}
          hint={summary.net.startsWith("-") ? "এই সময়ে ক্ষতি" : "এই সময়ে লাভ"}
          icon={ChartNoAxesCombined}
        />
        <KpiCard label="লেনদেন সংখ্যা" value={summary.count} icon={ReceiptText} />
      </section>

      <Card className="rounded-card shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">মাসিক আয় ও খরচ</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBarChart monthly={summary.monthly} banglaDigits={banglaDigits} />
        </CardContent>
      </Card>

      <Card className="rounded-card shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">খরচ ক্যাটাগরি অনুযায়ী ভাগ</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpensePieChart
            slices={summary.expenseByCategory}
            banglaDigits={banglaDigits}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-card bg-muted" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-card bg-muted" />
    </div>
  );
}
