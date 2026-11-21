"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

const THEME_KEY = "khamar-theme";

function subscribeToTheme(callback) {
  // Only a saved choice can change the default; OS preference is not used.
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("storage", callback);
  };
}

function getThemeSnapshot() {
  let saved = null;
  try {
    saved = window.localStorage.getItem(THEME_KEY);
  } catch {
    saved = null;
  }
  if (saved === "dark") return true;
  if (saved === "light") return false;
  // No saved preference: dark by default (an explicit choice still wins).
  return true;
}

function getServerThemeSnapshot() {
  return null;
}

export function ThemeToggle({ className }) {
  const storedDark = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );
  const [override, setOverride] = useState(null);
  const dark = override === null ? storedDark : override;

  useEffect(() => {
    if (dark === null) return;
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function toggleTheme() {
    const next = !dark;
    setOverride(next);
    try {
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // Storage may be unavailable; the class toggle still applies for this visit.
    }
    document.documentElement.classList.toggle("dark", next);
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
