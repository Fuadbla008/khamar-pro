"use client";

import { RotateCcw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/domain/multi-select";
import {
  dateRangeForPreset,
  DATE_PRESETS,
} from "@/lib/reports/constants";

export function ReportsFilterBar({ filters, setFilters, categories, members, animals }) {
  const incomeCategories = categories
    .filter((category) => category.type === "income")
    .map((category) => ({ value: category.code, label: category.label }));
  const expenseCategories = categories
    .filter((category) => category.type === "expense")
    .map((category) => ({ value: category.code, label: category.label }));

  function choosePreset(value) {
    if (value === "custom") {
      setFilters({ preset: value });
      return;
    }
    setFilters({ preset: value, ...dateRangeForPreset(value) });
  }

  function chooseDate(key, value) {
    setFilters({ preset: "custom", [key]: value });
  }

  function chooseCategories(type, values) {
    const codesOfType = new Set(
      categories.filter((category) => category.type === type).map((category) => category.code)
    );
    const untouched = filters.categories.filter((code) => !codesOfType.has(code));
    setFilters({ categories: [...untouched, ...values] });
  }

  function reset() {
    setFilters({
      preset: "this_month",
      ...dateRangeForPreset("this_month"),
      paidBy: [],
      categories: [],
      animalIds: [],
    });
  }

  return (
    <Card className="rounded-card shadow-soft">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => choosePreset(preset.value)}
              className={cn(
                "press min-h-9 rounded-pill border px-3 text-xs font-semibold",
                filters.preset === preset.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground"
              )}
            >
              {preset.label}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            className="press ml-auto min-h-9 rounded-pill px-3 text-xs"
          >
            <RotateCcw className="size-3.5" />
            মুছুন
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">শুরুর তারিখ</span>
            <Input
              type="date"
              value={filters.from}
              onChange={(event) => chooseDate("from", event.target.value)}
              className="h-11 rounded-input"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">শেষ তারিখ</span>
            <Input
              type="date"
              value={filters.to}
              onChange={(event) => chooseDate("to", event.target.value)}
              className="h-11 rounded-input"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <MultiSelect
            label="সদস্য"
            options={[
              { value: "none", label: "সদস্য নেই" },
              ...members.map((member) => ({ value: member.id, label: member.name })),
            ]}
            value={filters.paidBy}
            onChange={(values) => setFilters({ paidBy: values })}
          />
          <MultiSelect
            label="আয়ের ক্যাটাগরি"
            options={incomeCategories}
            value={filters.categories.filter((code) =>
              incomeCategories.some((item) => item.value === code)
            )}
            onChange={(values) => chooseCategories("income", values)}
          />
          <MultiSelect
            label="খরচের ক্যাটাগরি"
            options={expenseCategories}
            value={filters.categories.filter((code) =>
              expenseCategories.some((item) => item.value === code)
            )}
            onChange={(values) => chooseCategories("expense", values)}
          />
          <MultiSelect
            label="পশু"
            options={[
              { value: "none", label: "পশু ছাড়া" },
              ...animals.map((animal) => ({
                value: animal.id,
                label: `${animal.tagNo}${animal.name ? ` · ${animal.name}` : ""}`,
              })),
            ]}
            value={filters.animalIds}
            onChange={(values) => setFilters({ animalIds: values })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
