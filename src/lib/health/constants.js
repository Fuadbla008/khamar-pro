// Built-in enum labels for the health entity. These mirror the CHECK
// constraints in 0011_health.sql and are not owner-configurable categories.
import {
  HeartPulse,
  Pill,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Skull,
} from "lucide-react";

export const HEALTH_TYPES = [
  { value: "vaccine", label: "টিকা", icon: Syringe },
  { value: "deworming", label: "কৃমিনাশক", icon: Pill },
  { value: "treatment", label: "চিকিৎসা", icon: Stethoscope },
  { value: "checkup", label: "পরীক্ষা", icon: HeartPulse },
  { value: "sick", label: "অসুস্থতা", icon: HeartPulse },
  { value: "death", label: "মৃত্যু", icon: Skull },
];

export const HEALTH_TYPE_LABELS = Object.fromEntries(
  HEALTH_TYPES.map((item) => [item.value, item.label])
);

export function healthTypeMeta(type) {
  return (
    HEALTH_TYPES.find((item) => item.value === type) ?? {
      label: type ?? "—",
      icon: ShieldCheck,
    }
  );
}

// Tab labels required by the brief. "চিকিৎসা" covers every medical
// intervention; "অসুস্থ" covers illness and loss events.
export const HEALTH_TABS = [
  { value: "all", label: "সব", types: null },
  { value: "vaccine", label: "টিকা", types: ["vaccine"] },
  {
    value: "treatment",
    label: "চিকিৎসা",
    types: ["treatment", "deworming", "checkup"],
  },
  { value: "sick", label: "অসুস্থ", types: ["sick", "death"] },
];

export const HEALTH_TAB_VALUES = HEALTH_TABS.map((tab) => tab.value);

export const DUE_WINDOW_DAYS = 7;

export function dueWindowDates(today = new Date()) {
  const toIso = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + DUE_WINDOW_DAYS);
  return { start: toIso(today), end: toIso(end) };
}
