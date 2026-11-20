"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createMovementAction } from "@/lib/inventory/actions";

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function MovementForm({ farmId, item, direction, onDone }) {
  const [state, formAction, pending] = useActionState(
    createMovementAction,
    null
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const isIn = direction === "in";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="farmId" value={farmId} />
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="direction" value={direction} />

      <p className="rounded-input bg-muted/60 p-3 text-sm">
        {item.name_bn} · {isIn ? "স্টকে যোগ হবে" : "স্টক থেকে কাটা হবে"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="movement-qty">
            পরিমাণ ({item.unit}) *
          </Label>
          <Input
            id="movement-qty"
            name="qty"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            placeholder="0"
            className="h-11 rounded-input"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="movement-date">তারিখ *</Label>
          <Input
            id="movement-date"
            name="date"
            type="date"
            defaultValue={localToday()}
            className="h-11 rounded-input"
            required
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="movement-price">একক মূল্য (৳)</Label>
          <Input
            id="movement-price"
            name="unitPrice"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            defaultValue={item.unit_price ?? ""}
            className="h-11 rounded-input"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="movement-note">নোট</Label>
          <Textarea
            id="movement-note"
            name="note"
            rows={2}
            className="rounded-input"
          />
        </div>
      </div>

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
        {pending ? "অপেক্ষা করুন..." : isIn ? "+ যোগ করুন" : "− ব্যবহার করুন"}
      </Button>
    </form>
  );
}
