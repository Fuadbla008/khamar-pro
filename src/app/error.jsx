"use client";

import { LanguageToggle } from "@/components/domain/language-toggle";
import { Button } from "@/components/ui/button";

export default function Error({ reset }) {
  return (
    <main className="relative flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-2xl"
      >
        ⚠️
      </span>
      <h1 className="text-2xl font-bold tracking-tight">কিছু একটা ভুল হয়েছে</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        পেজটি লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।
      </p>
      <Button
        type="button"
        className="press h-11 rounded-input"
        onClick={() => reset()}
      >
        আবার চেষ্টা করুন
      </Button>
    </main>
  );
}
