"use client";

import { useActionState, useEffect, useState } from "react";
import {
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Lock,
  Pencil,
  Plus,
} from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  archiveCategoryAction,
  moveCategoryAction,
  saveCategoryAction,
} from "@/lib/settings/actions";
import {
  COMING_SOON_ENTITIES,
  CONFIGURABLE_ENTITIES,
  TRANSACTION_TYPE_OPTIONS,
} from "@/lib/settings/constants";
import { ResponsiveModal } from "./responsive-modal";
import { useIsDesktop } from "@/hooks/use-is-desktop";

function CategoryForm({ farmId, entity, category, onDone }) {
  const [state, action, pending] = useActionState(saveCategoryAction, null);
  const [transactionType, setTransactionType] = useState(
    category?.transaction_type ?? "none"
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="farmId" value={farmId} />
      <input type="hidden" name="entity" value={entity} />
      {category ? (
        <input type="hidden" name="originalCode" value={category.code} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="category-name-bn">নাম (বাংলা) *</Label>
        <Input
          id="category-name-bn"
          name="nameBn"
          defaultValue={category?.name_bn ?? ""}
          className="h-11 rounded-input"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category-name">নাম (ইংরেজি, ঐচ্ছিক)</Label>
        <Input
          id="category-name"
          name="name"
          defaultValue={category?.name ?? ""}
          className="h-11 rounded-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category-code">
          কোড (লাতিন অক্ষর, তৈরির পর বদলানো যাবে না) *
        </Label>
        <Input
          id="category-code"
          name="code"
          defaultValue={category?.code ?? ""}
          disabled={Boolean(category)}
          placeholder="যেমন: hay"
          className="h-11 rounded-input font-mono"
          required={!category}
        />
      </div>

      {entity === "transaction" ? (
        <div className="space-y-2">
          <Label htmlFor="category-type">লেনদেনের ধরন</Label>
          <Select value={transactionType} onValueChange={setTransactionType}>
            <SelectTrigger id="category-type" className="h-11 rounded-input">
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">নির্দিষ্ট নয়</SelectItem>
              {TRANSACTION_TYPE_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="hidden"
            name="transactionType"
            value={transactionType === "none" ? "" : transactionType}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="category-icon">আইকন (ইমোজি)</Label>
          <Input
            id="category-icon"
            name="icon"
            defaultValue={category?.icon ?? ""}
            className="h-11 rounded-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category-color">রং (কোড)</Label>
          <Input
            id="category-color"
            name="color"
            defaultValue={category?.color ?? ""}
            placeholder="#8B5E3C"
            className="h-11 rounded-input"
          />
        </div>
      </div>

      <Label
        htmlFor="category-active"
        className="flex min-h-11 items-center gap-2 font-normal"
      >
        <Checkbox
          id="category-active"
          name="isActive"
          defaultChecked={category ? category.is_active : true}
        />
        সক্রিয় রাখুন
      </Label>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="press h-11 w-full rounded-input"
      >
        {pending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
      </Button>
    </form>
  );
}

function MoveButton({ farmId, entity, code, direction, disabled, label }) {
  return (
    <form action={moveCategoryAction}>
      <input type="hidden" name="farmId" value={farmId} />
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="direction" value={direction} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-label={label}
        title={label}
        className="press size-11"
      >
        {direction === "up" ? (
          <ArrowUp className="size-4" />
        ) : (
          <ArrowDown className="size-4" />
        )}
      </Button>
    </form>
  );
}

export function CategoriesManager({ farmId, rowsByEntity, canManage }) {
  const isDesktop = useIsDesktop();
  const [filters, setFilters] = useQueryStates({
    entity: parseAsStringLiteral([
      "animal",
      "transaction",
      "inventory",
      "health",
    ]).withDefault("animal"),
  });
  const [editing, setEditing] = useState(null);
  const entity = filters.entity;

  const rows = rowsByEntity[entity] ?? [];
  const entityLabel =
    CONFIGURABLE_ENTITIES.find((item) => item.value === entity)?.label ?? "";

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto">
          {CONFIGURABLE_ENTITIES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilters({ entity: item.value })}
              className={cn(
                "press flex min-h-11 shrink-0 items-center rounded-input border px-4 text-sm font-medium",
                entity === item.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {COMING_SOON_ENTITIES.map((item) => (
            <span
              key={item.value}
              className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground"
            >
              <Lock className="size-3" />
              {item.label} · শীঘ্রই আসছে
            </span>
          ))}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{entityLabel} ক্যাটাগরি</h2>
            <p className="text-xs text-muted-foreground">
              {rows.length} টি ক্যাটাগরি · কোড পরিবর্তন করা যাবে না
            </p>
          </div>
          {canManage ? (
            <Button
              type="button"
              onClick={() => setEditing({ isNew: true })}
              className="press h-11 rounded-input"
            >
              <Plus className="size-4" />
              নতুন
            </Button>
          ) : null}
        </div>

        {rows.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card shadow-soft">
            {rows.map((row, index) => (
              <li
                key={row.id}
                className="flex items-center gap-2 px-3 py-3 sm:px-4"
              >
                <span className="w-7 shrink-0 text-center text-lg" aria-hidden>
                  {row.icon ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {row.name_bn}
                    {!row.is_active ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (নিষ্ক্রিয়)
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.code}
                    </span>
                    <Badge
                      variant={row.overridden ? "default" : "secondary"}
                      className="rounded-pill px-2 py-0 text-[10px]"
                    >
                      {row.overridden ? "আপনার খামার" : "বৈশ্বিক"}
                    </Badge>
                    {row.transaction_type ? (
                      <Badge
                        variant="outline"
                        className="rounded-pill px-2 py-0 text-[10px]"
                      >
                        {TRANSACTION_TYPE_OPTIONS.find(
                          (item) => item.value === row.transaction_type
                        )?.label ?? row.transaction_type}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {canManage ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <MoveButton
                      farmId={farmId}
                      entity={entity}
                      code={row.code}
                      direction="up"
                      disabled={index === 0}
                      label="উপরে সরান"
                    />
                    <MoveButton
                      farmId={farmId}
                      entity={entity}
                      code={row.code}
                      direction="down"
                      disabled={index === rows.length - 1}
                      label="নিচে সরান"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(row)}
                      aria-label={`${row.name_bn} সম্পাদনা`}
                      className="press size-11"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {row.is_active ? (
                      <form action={archiveCategoryAction}>
                        <input type="hidden" name="farmId" value={farmId} />
                        <input type="hidden" name="entity" value={entity} />
                        <input type="hidden" name="code" value={row.code} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          aria-label={`${row.name_bn} নিষ্ক্রিয় করুন`}
                          className="press size-11 text-destructive"
                          onClick={(event) => {
                            if (!window.confirm(`${row.name_bn} নিষ্ক্রিয় করবেন?`)) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <Archive className="size-4" />
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            এই বিভাগে এখনো কোনো ক্যাটাগরি নেই।
          </p>
        )}
      </section>

      {editing && canManage ? (
        <ResponsiveModal
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          isDesktop={isDesktop}
          title={editing.isNew ? "নতুন ক্যাটাগরি" : "ক্যাটাগরি সম্পাদনা"}
          description="বৈশ্বিক ক্যাটাগরি সম্পাদনা করলে আপনার খামারের জন্য একটি কপি তৈরি হবে"
        >
          <CategoryForm
            key={editing.code ?? "new"}
            farmId={farmId}
            entity={entity}
            category={editing.isNew ? null : editing}
            onDone={() => setEditing(null)}
          />
        </ResponsiveModal>
      ) : null}
    </>
  );
}
