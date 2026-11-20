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
import { Textarea } from "@/components/ui/textarea";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import {
  archiveFieldAction,
  moveFieldAction,
  saveFieldAction,
} from "@/lib/settings/actions";
import {
  COMING_SOON_ENTITIES,
  CONFIGURABLE_ENTITIES,
  FIELD_TYPES,
  MAX_FIELDS_PER_ENTITY,
} from "@/lib/settings/constants";
import { ResponsiveModal } from "./responsive-modal";

function typeLabel(type) {
  return FIELD_TYPES.find((item) => item.value === type)?.label ?? type;
}

function optionsText(options) {
  if (!Array.isArray(options)) return "";
  return options
    .map((option) =>
      typeof option === "string" ? option : option.label_bn || option.label || option.value
    )
    .join("\n");
}

function FieldForm({ farmId, entity, field, onDone }) {
  const [state, action, pending] = useActionState(saveFieldAction, null);
  const [type, setType] = useState(field?.type ?? "text");

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const needsOptions = type === "select" || type === "multiselect";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="farmId" value={farmId} />
      <input type="hidden" name="entity" value={entity} />
      {field ? (
        <input type="hidden" name="originalKey" value={field.key} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="field-label-bn">ঘরের নাম (বাংলা) *</Label>
        <Input
          id="field-label-bn"
          name="labelBn"
          defaultValue={field?.label_bn ?? ""}
          className="h-11 rounded-input"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="field-label">নাম (ইংরেজি, ঐচ্ছিক)</Label>
        <Input
          id="field-label"
          name="label"
          defaultValue={field?.label ?? ""}
          className="h-11 rounded-input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="field-key">কী (লাতিন অক্ষর, বদলানো যাবে না) *</Label>
          <Input
            id="field-key"
            name="key"
            defaultValue={field?.key ?? ""}
            disabled={Boolean(field)}
            placeholder="যেমন: vaccination_date"
            className="h-11 rounded-input font-mono"
            required={!field}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="field-type">ধরন</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="field-type" className="h-11 rounded-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="type" value={type} />
        </div>
      </div>

      <p className="flex items-center gap-2 rounded-input bg-muted/60 p-3 text-xs text-muted-foreground">
        <Lock className="size-3.5 shrink-0" />
        ফর্মুলা ধরনের ঘর শীঘ্রই আসছে।
      </p>

      {needsOptions ? (
        <div className="space-y-2">
          <Label htmlFor="field-options">নির্বাচনের অপশন (এক লাইনে একটি)</Label>
          <Textarea
            id="field-options"
            name="options"
            rows={3}
            defaultValue={optionsText(field?.options)}
            className="rounded-input"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="field-default">ডিফল্ট মান (ঐচ্ছিক)</Label>
        <Input
          id="field-default"
          name="defaultValue"
          defaultValue={field?.default_value ?? ""}
          className="h-11 rounded-input"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">বিকল্প</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              id: "field-required",
              name: "required",
              label: "আবশ্যক",
              checked: field?.required ?? false,
            },
            {
              id: "field-active",
              name: "isActive",
              label: "সক্রিয়",
              checked: field?.is_active ?? true,
            },
            {
              id: "field-list",
              name: "showInList",
              label: "তালিকায় দেখান",
              checked: field?.show_in_list ?? false,
            },
            {
              id: "field-form",
              name: "showInForm",
              label: "ফর্মে দেখান",
              checked: field?.show_in_form ?? true,
            },
          ].map((item) => {
            return (
              <Label
                key={item.name}
                htmlFor={item.id}
                className="flex min-h-11 items-center gap-2 font-normal"
              >
                <Checkbox
                  id={item.id}
                  name={item.name}
                  defaultChecked={Boolean(item.checked)}
                />
                {item.label}
              </Label>
            );
          })}
        </div>
      </fieldset>

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

function MoveButton({ farmId, entity, fieldKey, direction, disabled, label }) {
  return (
    <form action={moveFieldAction}>
      <input type="hidden" name="farmId" value={farmId} />
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="key" value={fieldKey} />
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

export function FieldsManager({ farmId, rowsByEntity, totalByEntity, canManage }) {
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
  const total = totalByEntity[entity] ?? 0;
  const full = total >= MAX_FIELDS_PER_ENTITY;
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
            <h2 className="text-base font-semibold">
              {entityLabel} এর অতিরিক্ত ঘর
            </h2>
            <p className="text-xs text-muted-foreground">
              {total} / {MAX_FIELDS_PER_ENTITY} ঘর ব্যবহৃত · কী তৈরির পর
              বদলানো যাবে না
            </p>
          </div>
          {canManage ? (
            <Button
              type="button"
              disabled={full}
              onClick={() => setEditing({ isNew: true })}
              className="press h-11 rounded-input"
            >
              <Plus className="size-4" />
              নতুন ঘর
            </Button>
          ) : null}
        </div>

        <div
          className="h-1.5 overflow-hidden rounded-pill bg-muted"
          role="progressbar"
          aria-valuenow={total}
          aria-valuemin={0}
          aria-valuemax={MAX_FIELDS_PER_ENTITY}
        >
          <div
            className={cn("h-full bg-primary", full && "bg-destructive")}
            style={{ width: `${Math.min(100, (total / MAX_FIELDS_PER_ENTITY) * 100)}%` }}
          />
        </div>

        {full ? (
          <p className="text-xs text-destructive">
            সর্বোচ্চ {MAX_FIELDS_PER_ENTITY} টি ঘর পূরণ হয়ে গেছে। নতুন ঘর যোগ
            করতে একটি নিষ্ক্রিয় করে দিন।
          </p>
        ) : null}

        {rows.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card shadow-soft">
            {rows.map((row, index) => (
              <li
                key={row.id}
                className="flex items-center gap-2 px-3 py-3 sm:px-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {row.label_bn || row.label}
                    {!row.is_active ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (নিষ্ক্রিয়)
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.key}
                    </span>
                    <Badge
                      variant="secondary"
                      className="rounded-pill px-2 py-0 text-[10px]"
                    >
                      {typeLabel(row.type)}
                    </Badge>
                    {row.required ? (
                      <Badge
                        variant="outline"
                        className="rounded-pill px-2 py-0 text-[10px]"
                      >
                        আবশ্যক
                      </Badge>
                    ) : null}
                    <Badge
                      variant={row.overridden ? "default" : "secondary"}
                      className="rounded-pill px-2 py-0 text-[10px]"
                    >
                      {row.overridden ? "আপনার খামার" : "বৈশ্বিক"}
                    </Badge>
                  </div>
                </div>

                {canManage ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <MoveButton
                      farmId={farmId}
                      entity={entity}
                      fieldKey={row.key}
                      direction="up"
                      disabled={index === 0}
                      label="উপরে সরান"
                    />
                    <MoveButton
                      farmId={farmId}
                      entity={entity}
                      fieldKey={row.key}
                      direction="down"
                      disabled={index === rows.length - 1}
                      label="নিচে সরান"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(row)}
                      aria-label={`${row.label_bn || row.label} সম্পাদনা`}
                      className="press size-11"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {row.is_active ? (
                      <form action={archiveFieldAction}>
                        <input type="hidden" name="farmId" value={farmId} />
                        <input type="hidden" name="entity" value={entity} />
                        <input type="hidden" name="key" value={row.key} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          aria-label={`${row.label_bn || row.label} নিষ্ক্রিয় করুন`}
                          className="press size-11 text-destructive"
                          onClick={(event) => {
                            if (
                              !window.confirm(
                                `${row.label_bn || row.label} নিষ্ক্রিয় করবেন?`
                              )
                            ) {
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
            এই বিভাগে এখনো কোনো অতিরিক্ত ঘর নেই।
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
          title={editing.isNew ? "নতুন অতিরিক্ত ঘর" : "ঘর সম্পাদনা"}
          description="বৈশ্বিক ঘর সম্পাদনা করলে আপনার খামারের জন্য একটি কপি তৈরি হবে"
        >
          <FieldForm
            key={editing.key ?? "new"}
            farmId={farmId}
            entity={entity}
            field={editing.isNew ? null : editing}
            onDone={() => setEditing(null)}
          />
        </ResponsiveModal>
      ) : null}
    </>
  );
}
