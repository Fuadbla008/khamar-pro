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
  createItemAction,
  updateItemAction,
} from "@/lib/inventory/actions";
import { UNITS } from "@/lib/inventory/constants";
import { DynamicForm } from "./dynamic-form";

export function InventoryForm({ farmId, item, definitions, draftEntity = "inventory" }) {
  const { data: categories = [] } = useCategories(farmId, "inventory");
  const action = item ? updateItemAction : createItemAction;

  return (
    <DynamicForm
      action={action}
      definitions={definitions}
      defaultValues={item?.custom_fields ?? {}}
      submitLabel={item ? "হালনাগাদ করুন" : "আইটেম যোগ করুন"}
      pendingLabel={item ? "হালনাগাদ হচ্ছে..." : "যোগ করা হচ্ছে..."}
      draftEntity={draftEntity}
    >
      {() => (
        <>
          <input type="hidden" name="farmId" value={farmId} />
          {item ? (
            <input type="hidden" name="itemId" value={item.id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inventory-name-bn">নাম (বাংলা) *</Label>
              <Input
                id="inventory-name-bn"
                name="nameBn"
                defaultValue={item?.name_bn ?? ""}
                placeholder="যেমন: গোখাদ্য"
                className="h-11 rounded-input"
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inventory-name">নাম (ইংরেজি, ঐচ্ছিক)</Label>
              <Input
                id="inventory-name"
                name="name"
                defaultValue={item?.name ?? ""}
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventory-category">ক্যাটাগরি *</Label>
              <Select
                name="categoryCode"
                defaultValue={item?.category_code ?? undefined}
              >
                <SelectTrigger
                  id="inventory-category"
                  className="h-11 rounded-input"
                >
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
              <Label htmlFor="inventory-unit">একক *</Label>
              <Select name="unit" defaultValue={item?.unit ?? "কেজি"}>
                <SelectTrigger id="inventory-unit" className="h-11 rounded-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventory-current">
                {item ? "বর্তমান স্টক (সমন্বয়)" : "প্রারম্ভিক স্টক"}
              </Label>
              <Input
                id="inventory-current"
                name="currentStock"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={item?.current_stock ?? "0"}
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventory-min">ন্যুনতম স্টক</Label>
              <Input
                id="inventory-min"
                name="minStock"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={item?.min_stock ?? "0"}
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inventory-price">একক মূল্য (৳)</Label>
              <Input
                id="inventory-price"
                name="unitPrice"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={item?.unit_price ?? ""}
                className="h-11 rounded-input"
              />
            </div>
          </div>
        </>
      )}
    </DynamicForm>
  );
}
