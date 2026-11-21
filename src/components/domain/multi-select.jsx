"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import { Checkbox } from "@/components/ui/checkbox";

// A dependency-free multi-select built from shadcn primitives. A native
// <details> gives us accessible open/close behaviour on touch devices without
// adding a popover package.
export function MultiSelect({ label, options = [], value = [], onChange, emptyLabel = "সব" }) {
  const selected = new Set(value);
  const summary =
    selected.size === 0
      ? `${label}: ${emptyLabel}`
      : `${label}: ${selected.size} টি নির্বাচিত`;

  function toggle(optionValue, checked) {
    const next = new Set(selected);
    if (checked) next.add(optionValue);
    else next.delete(optionValue);
    onChange([...next]);
  }

  return (
    <details className="group relative min-w-0 flex-1">
      <summary
        className={cn(
          "press flex h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-input border border-input bg-background px-3 text-sm",
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 z-40 mt-1 max-h-64 w-full min-w-[220px] overflow-y-auto rounded-input border border-border bg-popover p-1 text-popover-foreground shadow-lg">
        {options.length ? (
          options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent/10"
            >
              <Checkbox
                checked={selected.has(option.value)}
                onCheckedChange={(checked) => toggle(option.value, checked === true)}
              />
              <span className="truncate">{option.label}</span>
            </label>
          ))
        ) : (
          <p className="px-2 py-3 text-xs text-muted-foreground">কোনো বিকল্প নেই</p>
        )}
      </div>
    </details>
  );
}
