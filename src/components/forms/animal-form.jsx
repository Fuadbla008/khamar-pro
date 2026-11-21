"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCategories } from "@/hooks/use-categories";
import {
  createAnimalAction,
  updateAnimalAction,
} from "@/lib/animals/actions";
import { GENDERS, STATUSES } from "@/lib/animals/constants";
import { DynamicForm } from "./dynamic-form";

export function AnimalForm({ farmId, animal, definitions, draftEntity = "animal" }) {
  const { data: categories = [] } = useCategories(farmId, "animal");
  const action = animal ? updateAnimalAction : createAnimalAction;

  return (
    <DynamicForm
      action={action}
      definitions={definitions}
      defaultValues={animal?.custom_fields ?? {}}
      submitLabel={animal ? "হালনাগাদ করুন" : "পশু যোগ করুন"}
      pendingLabel={animal ? "হালনাগাদ হচ্ছে..." : "যোগ করা হচ্ছে..."}
      draftEntity={draftEntity}
    >
      {() => (
        <>
          <input type="hidden" name="farmId" value={farmId} />
          {animal ? (
            <input type="hidden" name="animalId" value={animal.id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tagNo">ট্যাগ নম্বর *</Label>
              <Input
                id="tagNo"
                name="tagNo"
                defaultValue={animal?.tag_no ?? ""}
                placeholder="যেমন: A-101"
                className="h-11 rounded-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">নাম</Label>
              <Input
                id="name"
                name="name"
                defaultValue={animal?.name ?? ""}
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryCode">ধরন *</Label>
              <Select
                name="categoryCode"
                defaultValue={animal?.category_code ?? undefined}
              >
                <SelectTrigger id="categoryCode" className="h-11 rounded-input">
                  <SelectValue placeholder="নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.code} value={category.code}>
                      {category.name_bn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">লিঙ্গ</Label>
              <Select name="gender" defaultValue={animal?.gender ?? "unknown"}>
                <SelectTrigger id="gender" className="h-11 rounded-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">জন্ম তারিখ</Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                defaultValue={animal?.dob ?? ""}
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseDate">ক্রয় তারিখ</Label>
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                defaultValue={animal?.purchase_date ?? ""}
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchasePrice">ক্রয় মূল্য (৳)</Label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={animal?.purchase_price ?? ""}
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">অবস্থা</Label>
              <Select name="status" defaultValue={animal?.status ?? "active"}>
                <SelectTrigger id="status" className="h-11 rounded-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="photoUrl">ছবির লিংক</Label>
              <Input
                id="photoUrl"
                name="photoUrl"
                type="url"
                defaultValue={animal?.photo_url ?? ""}
                placeholder="https://..."
                className="h-11 rounded-input"
              />
            </div>
          </div>
        </>
      )}
    </DynamicForm>
  );
}
