"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { createFarmAction } from "@/lib/farms/actions";

export function OnboardingForm({ types }) {
  const [state, formAction, pending] = useActionState(createFarmAction, null);
  const [primaryType, setPrimaryType] = useState("");

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">খামারের নাম</Label>
        <Input
          id="name"
          name="name"
          placeholder="যেমন: ভাইয়ের খামার"
          className="h-11 rounded-input"
          required
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">প্রাণীর ধরন</legend>
        {types.length ? (
          <>
            {/* Controlled value submitted explicitly so it never depends on the
                radio group's implicit native input being present in the form. */}
            <input type="hidden" name="primaryType" value={primaryType} />
            <RadioGroup
              value={primaryType}
              onValueChange={setPrimaryType}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              {types.map((type) => (
                <Label
                  key={type.code}
                  htmlFor={`type-${type.code}`}
                  className="press flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-input border border-border p-3 text-center has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem
                    value={type.code}
                    id={`type-${type.code}`}
                    className="sr-only"
                  />
                  <span aria-hidden className="text-2xl">
                    {type.icon}
                  </span>
                  <span className="text-sm font-medium">{type.name_bn}</span>
                </Label>
              ))}
            </RadioGroup>
          </>
        ) : (
          <p className="text-sm text-destructive">
            প্রাণীর ধরন লোড করা যায়নি। Supabase এ ০০০১–০০০৩ মাইগ্রেশনগুলো
            আবার চালু করে পেজটি রিফ্রেশ করুন।
          </p>
        )}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="address">ঠিকানা</Label>
        <Textarea
          id="address"
          name="address"
          rows={3}
          placeholder="গ্রাম, উপজেলা, জেলা"
          className="rounded-input"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || !types.length || !primaryType}
        className="press h-11 w-full rounded-input"
      >
        {pending ? "তৈরি করা হচ্ছে..." : "খামার তৈরি করুন"}
      </Button>
      {!primaryType && types.length ? (
        <p className="-mt-4 text-center text-xs text-muted-foreground">
          খামার তৈরি করতে একটি প্রাণীর ধরন বেছে নিন
        </p>
      ) : null}
    </form>
  );
}
