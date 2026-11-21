"use client";

import { useEffect, useState } from "react";
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
import { useAnimals } from "@/hooks/use-animals";
import { UNITS } from "@/lib/inventory/constants";
import {
  createProductionAction,
  updateProductionAction,
} from "@/lib/production/actions";
import { productionTypeMeta, PRODUCTION_TYPES } from "@/lib/production/constants";
import { DynamicForm } from "./dynamic-form";

const LOT = "__all__";

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function ProductionForm({ farmId, record, definitions, onDone, draftEntity = "production" }) {
  const { data: animals = [] } = useAnimals(farmId);
  const [animalId, setAnimalId] = useState(record?.animal_id ?? LOT);
  const [type, setType] = useState(record?.type ?? "");
  const [unit, setUnit] = useState(record?.unit ?? "পিস");
  const [state, setFormState] = useState(null);

  const action = record ? updateProductionAction : createProductionAction;

  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);

  async function trackedAction(prevState, formData) {
    const result = await action(prevState, formData);
    setFormState(result);
    return result;
  }

  function handleTypeChange(value) {
    setType(value);
    setUnit(productionTypeMeta(value).unit);
  }

  return (
    <DynamicForm
      action={trackedAction}
      definitions={definitions}
      defaultValues={record?.custom_fields ?? {}}
      submitLabel={record ? "হালনাগাদ করুন" : "রেকর্ড যোগ করুন"}
      pendingLabel={record ? "হালনাগাদ হচ্ছে..." : "যোগ করা হচ্ছে..."}
      disabled={!type}
      draftEntity={draftEntity}
    >
      {() => (
        <>
          <input type="hidden" name="farmId" value={farmId} />
          {record ? (
            <input type="hidden" name="recordId" value={record.id} />
          ) : null}
          <input type="hidden" name="animalId" value={animalId === LOT ? "" : animalId} />
          <input type="hidden" name="type" value={type} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="production-type">ধরন *</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger id="production-type" className="h-11 rounded-input">
                  <SelectValue placeholder="নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!type ? (
                <p className="text-xs text-muted-foreground">ধরন নির্বাচন করুন</p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="production-animal">পশু (ঐচ্ছিক)</Label>
              <Select value={animalId} onValueChange={setAnimalId}>
                <SelectTrigger id="production-animal" className="h-11 rounded-input">
                  <SelectValue placeholder="পশু নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LOT}>নির্দিষ্ট পশু নয় (পুরো দল)</SelectItem>
                  {animals.map((animal) => (
                    <SelectItem key={animal.id} value={animal.id}>
                      {animal.tag_no}
                      {animal.name ? ` — ${animal.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="production-qty">পরিমাণ *</Label>
              <Input
                id="production-qty"
                name="qty"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                defaultValue={record?.qty ?? ""}
                placeholder="0.00"
                className="h-11 rounded-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="production-unit">একক *</Label>
              <Select value={unit} onValueChange={setUnit} name="unit">
                <SelectTrigger id="production-unit" className="h-11 rounded-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="production-price">একক মূল্য (৳)</Label>
              <Input
                id="production-price"
                name="pricePerUnit"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                defaultValue={record?.price_per_unit ?? "0"}
                placeholder="0.00"
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="production-date">তারিখ *</Label>
              <Input
                id="production-date"
                name="date"
                type="date"
                defaultValue={record?.date ?? localToday()}
                className="h-11 rounded-input"
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="production-notes">নোট</Label>
              <Textarea
                id="production-notes"
                name="notes"
                rows={2}
                defaultValue={record?.notes ?? ""}
                className="rounded-input"
              />
            </div>

            <Label
              htmlFor="production-income"
              className="flex min-h-11 items-center gap-2 sm:col-span-2"
            >
              <Checkbox
                id="production-income"
                name="recordIncome"
                defaultChecked={Boolean(record?.linked_transaction_id)}
              />
              আয় হিসেবে রেকর্ড করো (লেনদেনে সংযুক্ত হবে)
            </Label>
          </div>
        </>
      )}
    </DynamicForm>
  );
}
