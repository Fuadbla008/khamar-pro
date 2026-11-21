"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LayoutDashboard, PawPrint, ReceiptText } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

const TUTORIAL_KEY = "khamar-tutorial-done";

const STEPS = [
  {
    title: "ড্যাশবোর্ড",
    description:
      "এই পাতায় আপনার খামারের সারাংশ দেখা যায় — মোট পশু, এই মাসের আয়-খরচ আর সাম্প্রতিক লেনদেন এক নজরে।",
    Icon: LayoutDashboard,
  },
  {
    title: "পশু",
    description:
      "পশু পাতায় নতুন প্রাণী যোগ করুন, তাদের তথ্য ও স্বাস্থ্য রেকর্ড এক জায়গায় রাখুন।",
    Icon: PawPrint,
  },
  {
    title: "লেনদেন",
    description:
      "লেনদেন পাতায় বিক্রয়, কেনাকাটা ও খরচ লিপিবদ্ধ করুন — হিসাব সবসময় হালকা থাকবে।",
    Icon: ReceiptText,
  },
];

const STEP_NUMBERS = ["১", "২", "৩"];

function subscribeToStorage(callback) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getTutorialDone() {
  return window.localStorage.getItem(TUTORIAL_KEY) === "1";
}

function getServerTutorialDone() {
  return null;
}

export function TutorialOverlay() {
  const tutorialDone = useSyncExternalStore(
    subscribeToStorage,
    getTutorialDone,
    getServerTutorialDone
  );
  const [dismissed, setDismissed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [step, setStep] = useState(0);
  const panelRef = useRef(null);

  const open = tutorialDone === false && !dismissed && !finished;

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") setDismissed(true);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.Icon;
  const isLastStep = step === STEPS.length - 1;

  function finish() {
    window.localStorage.setItem(TUTORIAL_KEY, "1");
    setFinished(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
        tabIndex={-1}
        className="w-full max-w-md space-y-5 rounded-card bg-card p-6 text-card-foreground shadow-soft outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted-foreground">
            {STEP_NUMBERS[step]} / ৩
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            aria-label="টিউটোরিয়াল এখন বন্ধ করুন"
            className="press"
          >
            এখন নয়
          </Button>
        </div>

        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h2 id="tutorial-title" className="text-lg font-bold">
            {current.title}
          </h2>
          <p
            id="tutorial-description"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            {current.description}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
          {STEPS.map((item, index) => (
            <span
              key={item.title}
              className={cn(
                "size-1.5 rounded-full transition-colors",
                index === step ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
            className="press"
          >
            পেছনে
          </Button>
          {isLastStep ? (
            <Button type="button" onClick={finish} className="press">
              শেষ করুন
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}
              className="press"
            >
              পরবর্তী
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
