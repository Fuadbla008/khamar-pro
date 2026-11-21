"use client";

import { Languages } from "lucide-react";
import { cn } from "cn";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";

export function LanguageToggle({ className, compact = true }) {
  const { language, setLanguage, t } = useLanguage();
  const isEnglish = language === "en";
  const label = isEnglish
    ? t("বাংলায় বদলান", "Switch to Bangla")
    : t("ইংরেজিতে বদলান", "Switch to English");

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "icon" : "default"}
      onClick={() => setLanguage(isEnglish ? "bn" : "en")}
      aria-label={label}
      title={t("ভাষা বদলান", "Change language")}
      className={cn("press", compact ? "size-11" : "h-11 gap-2 rounded-input px-3", className)}
    >
      <Languages className="size-5" />
      {compact ? (
        <span className="text-[11px] font-semibold">{isEnglish ? "EN" : "বাং"}</span>
      ) : (
        <span>{isEnglish ? "English" : "বাংলা"}</span>
      )}
    </Button>
  );
}
