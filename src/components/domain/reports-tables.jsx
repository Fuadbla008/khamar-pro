"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
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
import { formatDate, formatMoney, toBanglaDigits } from "@/lib/utils/format";

export const DETAIL_COLUMNS = [
  { key: "date", label: "তারিখ", format: "date" },
  { key: "typeLabel", label: "ধরন", format: "text" },
  { key: "category", label: "ক্যাটাগরি", format: "text" },
  { key: "paidBy", label: "সদস্য", format: "text" },
  { key: "animal", label: "পশু", format: "text" },
  { key: "amount", label: "অর্থ (৳)", format: "money" },
  { key: "note", label: "নোট", format: "text" },
];

const USER_COLUMNS = [
  { key: "name", label: "সদস্যের নাম", format: "text" },
  { key: "expenseCount", label: "মোট খরচ এন্ট্রি", format: "number" },
  { key: "incomeCount", label: "মোট আয় এন্ট্রি", format: "number" },
  { key: "expense", label: "কত টাকা খরচ (৳)", format: "money" },
  { key: "income", label: "কত টাকা আয় (৳)", format: "money" },
  { key: "balance", label: "ব্যালেন্স (৳)", format: "money" },
];

const ANIMAL_COLUMNS = [
  { key: "tagNo", label: "ট্যাগ নম্বর", format: "text" },
  { key: "name", label: "নাম", format: "text" },
  { key: "category", label: "ক্যাটাগরি", format: "text" },
  { key: "expense", label: "মোট খরচ (৳)", format: "money" },
  { key: "income", label: "মোট আয় (৳)", format: "money" },
  { key: "net", label: "লাভ/ক্ষতি (৳)", format: "money" },
];

const CATEGORY_COLUMNS = [
  { key: "type", label: "ধরন", format: "text" },
  { key: "category", label: "ক্যাটাগরি", format: "text" },
  { key: "amount", label: "অর্থ (৳)", format: "money" },
  { key: "percent", label: "শতাংশ", format: "number" },
];

function exportProps(farmId, farmSlug, meta, filters) {
  return { farmId, farmSlug, meta, filters, modes: ["current"] };
}

function TransactionDetails({ rows = [], banglaDigits, exportConfig, label, footer = null }) {
  return (
    <div className="space-y-3 rounded-input bg-muted/40 p-3">
      {rows.length ? (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(row.date, { banglaDigits })}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-pill px-2 py-0.5 text-xs font-semibold",
                    row.type === "income"
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {row.typeLabel}
                </span>
                <span className="truncate">{row.category}</span>
                {row.animal ? (
                  <span className="text-xs text-muted-foreground">· {row.animal}</span>
                ) : null}
              </div>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatMoney(row.amount, { banglaDigits })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">এই সময়সীমায় কোনো লেনদেন নেই।</p>
      )}
      {footer}
      <ExportButton
        {...exportConfig}
        data={{ columns: DETAIL_COLUMNS, rows }}
        filename={exportConfig.filename}
        label={label}
      />
    </div>
  );
}

export function UserWiseTable({
  rows = [],
  banglaDigits,
  farmId,
  farmSlug,
  meta,
  filters,
  expanded,
  setExpanded,
}) {
  const config = { ...exportProps(farmId, farmSlug, meta, filters), filename: "report_userwise" };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton
          {...config}
          data={{ columns: USER_COLUMNS, rows }}
          label="সব সদস্যের CSV"
        />
      </div>
      {rows.length ? (
        <div className="overflow-x-auto rounded-card border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>সদস্যের নাম</TableHead>
                <TableHead className="text-right">মোট খরচ এন্ট্রি</TableHead>
                <TableHead className="text-right">মোট আয় এন্ট্রি</TableHead>
                <TableHead className="text-right">কত টাকা খরচ</TableHead>
                <TableHead className="text-right">কত টাকা আয়</TableHead>
                <TableHead className="text-right">ব্যালেন্স</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((member) => {
                const open = expanded === member.userId;
                return (
                  <FragmentRow
                    key={member.userId}
                    open={open}
                    onToggle={() => setExpanded(open ? null : member.userId)}
                    colSpan={6}
                    detail={
                      <TransactionDetails
                        rows={member.transactions}
                        banglaDigits={banglaDigits}
                        exportConfig={{ ...config, filename: "report_userwise_member" }}
                        label="এই সদস্যের CSV"
                      />
                    }
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1.5">
                        {open ? (
                          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">
                          {member.name}
                          {member.roleLabel ? (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              ({member.roleLabel})
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {member.expenseCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {member.incomeCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(member.expense, { banglaDigits })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(member.income, { banglaDigits })}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        member.balance.startsWith("-") ? "text-destructive" : "text-success"
                      )}
                    >
                      {formatMoney(member.balance, { banglaDigits })}
                    </TableCell>
                  </FragmentRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="কোনো সদস্য পাওয়া যায়নি"
          description="নির্বাচিত সময়ে সদস্য বা লেনদেন নেই।"
        />
      )}
    </div>
  );
}

function FragmentRow({ open, onToggle, colSpan, detail, children }) {
  return (
    <>
      <TableRow
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        className="cursor-pointer"
      >
        {children}
      </TableRow>
      {open ? (
        <TableRow>
          <TableCell colSpan={colSpan}>{detail}</TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export function AnimalWiseTable({
  rows = [],
  banglaDigits,
  farmId,
  farmSlug,
  meta,
  filters,
  expanded,
  setExpanded,
}) {
  const config = { ...exportProps(farmId, farmSlug, meta, filters), filename: "report_animalwise" };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton
          {...config}
          data={{ columns: ANIMAL_COLUMNS, rows }}
          label="সব পশুর CSV"
        />
      </div>
      {rows.length ? (
        <div className="overflow-x-auto rounded-card border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ট্যাগ নম্বর</TableHead>
                <TableHead>নাম</TableHead>
                <TableHead>ক্যাটাগরি</TableHead>
                <TableHead className="text-right">মোট খরচ</TableHead>
                <TableHead className="text-right">মোট আয়</TableHead>
                <TableHead className="text-right">লাভ/ক্ষতি</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((animal) => {
                const open = expanded === animal.id;
                return (
                  <FragmentRow
                    key={animal.id}
                    open={open}
                    onToggle={() => setExpanded(open ? null : animal.id)}
                    colSpan={6}
                    detail={
                      <TransactionDetails
                        rows={animal.transactions}
                        banglaDigits={banglaDigits}
                        exportConfig={{ ...config, filename: "report_animalwise_animal" }}
                        label="এই পশুর CSV"
                        footer={
                          <Link
                            href={`/f/${farmId}/animals/${animal.id}?from=${filters.from ?? ""}&to=${filters.to ?? ""}`}
                            className="inline-flex min-h-9 items-center text-sm font-semibold text-primary hover:underline"
                          >
                            পশুর বিবরণ দেখুন
                          </Link>
                        }
                      />
                    }
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1.5">
                        {open ? (
                          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        {animal.tagNo}
                      </span>
                    </TableCell>
                    <TableCell>{animal.name || "—"}</TableCell>
                    <TableCell>{animal.category || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(animal.expense, { banglaDigits })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(animal.income, { banglaDigits })}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        animal.net.startsWith("-") ? "text-destructive" : "text-success"
                      )}
                    >
                      {formatMoney(animal.net, { banglaDigits })}
                    </TableCell>
                  </FragmentRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="কোনো পশু পাওয়া যায়নি"
          description="নির্বাচিত সময়ে পশুসংক্রান্ত লেনদেন নেই।"
        />
      )}
    </div>
  );
}

function CategorySubTable({ title, rows, total, banglaDigits, tone }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className={cn("text-sm font-semibold", tone)}>{title}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatMoney(total, { banglaDigits })}
        </span>
      </div>
      <div className="overflow-hidden rounded-input border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ক্যাটাগরি</TableHead>
              <TableHead className="text-right">অর্থ</TableHead>
              <TableHead className="text-right">শতাংশ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => {
                const percent = row.percent.toFixed(1);
                return (
                  <TableRow key={row.code}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.amount, { banglaDigits })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {banglaDigits ? toBanglaDigits(percent) : percent}%
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                  কোনো ডেটা নেই
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function CategoryWiseTable({
  data,
  banglaDigits,
  farmId,
  farmSlug,
  meta,
  filters,
}) {
  const rows = [
    ...data.income.map((item) => ({ ...item, type: "আয়" })),
    ...data.expense.map((item) => ({ ...item, type: "খরচ" })),
  ];
  const config = { ...exportProps(farmId, farmSlug, meta, filters), filename: "report_categorywise" };
  const totalOf = (items) =>
    items.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportButton
          {...config}
          data={{ columns: CATEGORY_COLUMNS, rows }}
          label="ক্যাটাগরি CSV"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <CategorySubTable
          title="আয়ের ক্যাটাগরি"
          rows={data.income}
          total={totalOf(data.income)}
          banglaDigits={banglaDigits}
          tone="text-success"
        />
        <CategorySubTable
          title="খরচের ক্যাটাগরি"
          rows={data.expense}
          total={totalOf(data.expense)}
          banglaDigits={banglaDigits}
          tone="text-destructive"
        />
      </div>
    </div>
  );
}

export function DetailTable({ rows = [], banglaDigits, farmId, farmSlug, meta, filters }) {
  const config = { ...exportProps(farmId, farmSlug, meta, filters), filename: "report_detail" };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton
          {...config}
          data={{ columns: DETAIL_COLUMNS, rows }}
          label="লেনদেন CSV"
        />
      </div>
      {rows.length ? (
        <div className="overflow-x-auto rounded-card border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>তারিখ</TableHead>
                <TableHead>ধরন</TableHead>
                <TableHead>ক্যাটাগরি</TableHead>
                <TableHead>সদস্য</TableHead>
                <TableHead>পশু</TableHead>
                <TableHead className="text-right">অর্থ</TableHead>
                <TableHead>নোট</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(row.date, { banglaDigits })}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-pill px-2 py-0.5 text-xs font-semibold",
                        row.type === "income"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {row.typeLabel}
                    </span>
                  </TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.paidBy}</TableCell>
                  <TableCell>{row.animal || "—"}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatMoney(row.amount, { banglaDigits })}
                  </TableCell>
                  <TableCell className="max-w-52 truncate text-muted-foreground">
                    {row.note || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="কোনো লেনদেন নেই"
          description="নির্বাচিত ফিল্টারে কোনো লেনদেন পাওয়া যায়নি।"
        />
      )}
    </div>
  );
}

export function summaryExportData(summary, banglaDigits) {
  const money = (value) => formatMoney(value, { banglaDigits });
  return {
    columns: [
      { key: "metric", label: "বিবরণ", format: "text" },
      { key: "value", label: "মান", format: "text" },
    ],
    rows: [
      { metric: "মোট আয়", value: money(summary.income) },
      { metric: "মোট খরচ", value: money(summary.expense) },
      { metric: "লাভ/ক্ষতি", value: money(summary.net) },
      { metric: "লেনদেন সংখ্যা", value: summary.count },
      ...summary.monthly.flatMap((month) => [
        { metric: `মাসিক আয় — ${month.label}`, value: money(month.income) },
        { metric: `মাসিক খরচ — ${month.label}`, value: money(month.expense) },
      ]),
      ...summary.expenseByCategory.map((item) => ({
        metric: `খরচ ক্যাটাগরি — ${item.label}`,
        value: money(item.amount),
      })),
    ],
  };
}
