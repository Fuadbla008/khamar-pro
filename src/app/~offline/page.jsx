"use client";

import { LanguageToggle } from "@/components/domain/language-toggle";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <span
        aria-hidden
        className="grid size-16 place-items-center rounded-3xl bg-primary text-3xl font-bold text-primary-foreground shadow-soft"
      >
        খ
      </span>
      <h1 className="text-2xl font-bold tracking-tight">আপনি অফলাইন আছেন</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        ইন্টারনেট সংযোগ ফিরে এলে আবার চেষ্টা করুন। আপনার খামারের তথ্য নিরাপদ
        আছে।
      </p>
      <Button
        type="button"
        className="press h-11 rounded-input"
        onClick={() => window.location.reload()}
      >
        আবার চেষ্টা করুন
      </Button>
    </main>
  );
}
