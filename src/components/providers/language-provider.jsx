"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { applyLanguage } from "@/lib/i18n/translate-dom";

const LANGUAGE_KEY = "khamar-language";
const CHANGE_EVENT = "khamar-language-change";
const DEFAULT_LANGUAGE = "en";

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

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  function setLanguage(next) {
    const value = next === "bn" ? "bn" : "en";
    try {
      window.localStorage.setItem(LANGUAGE_KEY, value);
    } catch {
      // Private browsing can block storage; the in-memory listener still updates.
    }
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
