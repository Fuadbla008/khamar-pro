"use client";

import {
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

const THEME_KEY = "khamar-theme";
const CHANGE_EVENT = "khamar-theme-change";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// A cached snapshot keeps the icon and the DOM class in lockstep within the
// same tick as a click; reading localStorage on every snapshot would lag the
// synchronous class toggle and briefly show the previous icon.
let cachedDark = null;

function subscribeToTheme(callback) {
  const onStorage = (event) => {
    if (!event.key || event.key === THEME_KEY) cachedDark = null;
    callback();
  };
  const onChange = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getThemeSnapshot() {
  if (cachedDark !== null) return cachedDark;
  let saved = null;
  try {
    saved = window.localStorage.getItem(THEME_KEY);
  } catch {
    saved = null;
  }
  // No saved preference: dark by default (an explicit choice still wins).
  if (saved === "dark") return true;
  if (saved === "light") return false;
  return true;
}

function getServerThemeSnapshot() {
  return null;
}

export function ThemeToggle({ className }) {
  const dark = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  useIsomorphicLayoutEffect(() => {
    if (dark === null) return;
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function toggleTheme() {
    const next = !dark;
    cachedDark = next;
    try {
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // Storage may be unavailable; the class toggle still applies this visit.
    }
    // Apply synchronously so the theme flips in the same frame as the click.
    document.documentElement.classList.toggle("dark", next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  const label =
    dark === null
      ? "থিম বদলান"
      : dark
        ? "হালকা থিমে যান"
        : "অন্ধকার থিমে যান";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn("press size-11 text-muted-foreground", className)}
    >
      {dark ? <Moon className="size-5" /> : <Sun className="size-5" />}
    </Button>
  );
}
