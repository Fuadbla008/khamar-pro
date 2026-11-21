"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import { applyLanguage } from "@/lib/i18n/translate-dom";

const LANGUAGE_KEY = "khamar-language";
const CHANGE_EVENT = "khamar-language-change";
const DEFAULT_LANGUAGE = "en";

// Layout effects run before the browser paints, so a saved language (or a
// toggle click) is visible on the very first frame instead of flashing the
// source strings first. useEffect is used during SSR where layout effects do
// not exist.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const LanguageContext = createContext(null);

function subscribe(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function readLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    return window.localStorage.getItem(LANGUAGE_KEY) === "bn" ? "bn" : "en";
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function getServerSnapshot() {
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }) {
  const language = useSyncExternalStore(subscribe, readLanguage, getServerSnapshot);

  // Applies on mount, on toggle, and on cross-tab storage changes.
  useIsomorphicLayoutEffect(() => {
    applyLanguage(language);
  }, [language]);

  function setLanguage(next) {
    const value = next === "bn" ? "bn" : "en";
    try {
      window.localStorage.setItem(LANGUAGE_KEY, value);
    } catch {
      // Private browsing can block storage; the in-memory listener still updates.
    }
    // Do the DOM swap in the click handler, before React re-renders, so the
    // change is immediate in production too. applyLanguage is idempotent, so
    // the layout effect above can safely apply it again after the re-render.
    applyLanguage(value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function t(bangla, english) {
    return language === "en" ? english : bangla;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
