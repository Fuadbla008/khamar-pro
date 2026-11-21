"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

const VISIT_KEY = "khamar-visit-count";
const DISMISS_KEY = "khamar-install-dismissed";

function isAppleMobile() {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Registers the service worker and offers an install banner on mobile. */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    try {
      const previous = Number(window.localStorage.getItem(VISIT_KEY));
      const count = Number.isFinite(previous) ? previous + 1 : 1;
      window.localStorage.setItem(VISIT_KEY, String(count));
      const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
      if (count >= 2 && !dismissed) {
        queueMicrotask(() => setVisible(true));
      }
    } catch {
      // Storage can be unavailable in private browsing; beforeinstallprompt still works.
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    }
    function handleInstalled() {
      setVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    setShowHelp(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  }

  async function install() {
    if (deferredPrompt && typeof deferredPrompt.prompt === "function") {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {
        // User cancelled or the browser refused the prompt.
      }
      setDeferredPrompt(null);
      dismiss();
      return;
    }
    setShowHelp(true);
  }

  if (!visible) return null;

  const helpText = isAppleMobile()
    ? "নিচের শেয়ার আইকনে টিপুন, তারপর «হোম স্ক্রিনে যোগ করুন» বেছে নিন।"
    : "ব্রাউজারের মেনু থেকে «অ্যাপ ইনস্টল করুন» বেছে নিন।";

  return (
    <div
      role="dialog"
      aria-label="খামার অ্যাপ ইনস্টল করুন"
      className={cn(
        "fixed inset-x-3 bottom-3 z-50 md:hidden",
        "rounded-card border border-border bg-card p-4 shadow-soft"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground"
        >
          খ
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">খামার অ্যাপ ইনস্টল করুন</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            যেকোনো জায়গা থেকে দ্রুত হিসাব দেখুন — অফলাইনেও চলবে।
          </p>
          {showHelp ? (
            <p className="mt-2 rounded-input bg-muted px-3 py-2 text-xs text-muted-foreground">
              {helpText}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" className="press" onClick={install}>
              ইনস্টল করুন
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
              এখন নয়
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="বন্ধ করুন"
          onClick={dismiss}
          className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
