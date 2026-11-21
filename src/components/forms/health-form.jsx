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
import { useHealthMedicines } from "@/hooks/use-health";
import {
  createHealthRecordAction,
  updateHealthRecordAction,
} from "@/lib/health/actions";
import { HEALTH_TYPES } from "@/lib/health/constants";
import { DynamicForm } from "./dynamic-form";

const LOT = "__all__";
const NONE = "__none__";

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function HealthForm({ farmId, record, definitions, onDone, draftEntity = "health" }) {
  const { data: animals = [] } = useAnimals(farmId);
  const { data: medicines = [] } = useHealthMedicines(farmId);
  const [animalId, setAnimalId] = useState(record?.animal_id ?? LOT);
  const [type, setType] = useState(record?.type ?? "");
  const [medicineId, setMedicineId] = useState(record?.medicine_item_id ?? NONE);
  const [state, setFormState] = useState(null);

  const action = record ? updateHealthRecordAction : createHealthRecordAction;

  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);

  // DynamicForm owns useActionState, so wrap the server action to observe its
  // result without changing the shared form engine.
  async function trackedAction(prevState, formData) {
    const result = await action(prevState, formData);
    setFormState(result);
    return result;
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
          <input
            type="hidden"
            name="medicineItemId"
            value={medicineId === NONE ? "" : medicineId}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="health-animal">পশু</Label>
              <Select value={animalId} onValueChange={setAnimalId}>
                <SelectTrigger id="health-animal" className="h-11 rounded-input">
                  <SelectValue placeholder="পশু নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LOT}>সব পশু (পুরো দল)</SelectItem>
                  {animals.map((animal) => (
                    <SelectItem key={animal.id} value={animal.id}>
                      {animal.tag_no}
                      {animal.name ? ` — ${animal.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="health-type">ধরন *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="health-type" className="h-11 rounded-input">
                  <SelectValue placeholder="নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {HEALTH_TYPES.map((item) => (
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
              <Label htmlFor="health-title">শিরোনাম *</Label>
              <Input
                id="health-title"
                name="title"
                defaultValue={record?.title ?? ""}
                placeholder="যেমন: FMD টিকা"
                className="h-11 rounded-input"
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="health-medicine">ঔষধ (ঐচ্ছিক)</Label>
              <Select value={medicineId} onValueChange={setMedicineId}>
                <SelectTrigger id="health-medicine" className="h-11 rounded-input">
                  <SelectValue placeholder="ঔষধ নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>কোনো ঔষধ নয়</SelectItem>
                  {medicines.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name_bn}
                      {item.unit ? ` (${item.unit})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="health-dosage">মাত্রা</Label>
              <Input
                id="health-dosage"
                name="dosage"
                defaultValue={record?.dosage ?? ""}
                placeholder="যেমন: ৫ মিলি"
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="health-cost">খরচ (৳)</Label>
              <Input
                id="health-cost"
                name="cost"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={record?.cost ?? "0"}
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="health-date">তারিখ *</Label>
              <Input
                id="health-date"
                name="date"
                type="date"
                defaultValue={record?.date ?? localToday()}
                className="h-11 rounded-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="health-next-due">পরবর্তী তারিখ</Label>
              <Input
                id="health-next-due"
                name="nextDueDate"
                type="date"
                defaultValue={record?.next_due_date ?? ""}
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="health-notes">নোট</Label>
              <Textarea
                id="health-notes"
                name="notes"
                rows={3}
                defaultValue={record?.notes ?? ""}
                className="rounded-input"
              />
            </div>

            <Label
              htmlFor="health-done"
              className="flex min-h-11 items-center gap-2 sm:col-span-2"
            >
              <Checkbox
                id="health-done"
                name="isDone"
                defaultChecked={record ? record.is_done : true}
              />
              সম্পন্ন হয়েছে (নির্ধারিত রেকর্ড সম্পন্ন করতে টিক দিন)
            </Label>
          </div>
        </>
      )}
    </DynamicForm>
  );
}
