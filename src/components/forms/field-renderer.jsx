"use client";

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
import { Switch } from "@/components/ui/switch";

function optionsOf(definition) {
  const options = Array.isArray(definition.options) ? definition.options : [];

  return options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option }
      : {
          value: String(option.value ?? ""),
          label: option.label_bn || option.label || String(option.value ?? ""),
        }
  );
}

export function FieldRenderer({ definition, value, onChange }) {
  const id = `field-${definition.key}`;
  const label = definition.label_bn || definition.label || definition.key;
  const requiredMark = definition.required ? " *" : "";
  const options = optionsOf(definition);

  if (definition.type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-input border border-border p-3">
        <Label htmlFor={id} className="font-normal">
          {label}
          {requiredMark}
        </Label>
        <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }

  if (definition.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];

    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {label}
          {requiredMark}
        </legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {options.map((option) => (
            <Label
              key={option.value}
              htmlFor={`${id}-${option.value}`}
              className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal"
            >
              <Checkbox
                id={`${id}-${option.value}`}
                checked={selected.includes(option.value)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value)
                  )
                }
              />
              {option.label}
            </Label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (definition.type === "select") {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>
          {label}
          {requiredMark}
        </Label>
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-11 rounded-input">
            <SelectValue placeholder="নির্বাচন করুন" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const inputType =
    definition.type === "number"
      ? "number"
      : definition.type === "date"
        ? "date"
        : definition.type === "file"
          ? "url"
          : "text";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {requiredMark}
      </Label>
      <Input
        id={id}
        type={inputType}
        value={value ?? ""}
        required={definition.required}
        placeholder={definition.type === "file" ? "https://..." : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-input"
      />
      {definition.type === "file" ? (
        <p className="text-xs text-muted-foreground">
          ফাইলের লিংক দিন (সরাসরি আপলোড শীঘ্রই)
        </p>
      ) : null}
    </div>
  );
}
