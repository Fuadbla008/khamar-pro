// Built-in production types mirror the CHECK constraint in 0012_production.sql.
// They are enum labels, not owner-configurable categories; owner-managed fields
// still live in custom_fields for this entity.
import {
  Egg,
  Milk,
  Package,
  Sprout,
  Beef,
  Droplets,
  Flower2,
  Soup,
} from "lucide-react";

export const PRODUCTION_TYPES = [
  { value: "milk", label: "দুধ", icon: Milk, unit: "লিটার" },
  { value: "egg", label: "ডিম", icon: Egg, unit: "পিস" },
  { value: "meat", label: "মাংস", icon: Beef, unit: "কেজি" },
  { value: "manure", label: "গোবর", icon: Sprout, unit: "কেজি" },
  { value: "wool", label: "পশম", icon: Flower2, unit: "কেজি" },
  { value: "honey", label: "মধু", icon: Droplets, unit: "কেজি" },
  { value: "other", label: "অন্যান্য", icon: Package, unit: "পিস" },
];

export const PRODUCTION_TYPE_LABELS = Object.fromEntries(
  PRODUCTION_TYPES.map((item) => [item.value, item.label])
);

export function productionTypeMeta(type) {
  return (
    PRODUCTION_TYPES.find((item) => item.value === type) ?? {
      label: PRODUCTION_TYPE_LABELS[type] ?? type ?? "—",
      icon: Soup,
      unit: "পিস",
    }
  );
}

// Tab labels required by the brief. Wool/honey live under "অন্যান্য".
export const PRODUCTION_TABS = [
  { value: "all", label: "সব", types: null },
  { value: "milk", label: "দুধ", types: ["milk"] },
  { value: "egg", label: "ডিম", types: ["egg"] },
  { value: "meat", label: "মাংস", types: ["meat"] },
  { value: "manure", label: "গোবর", types: ["manure"] },
  { value: "other", label: "অন্যান্য", types: ["wool", "honey", "other"] },
];

export const PRODUCTION_TAB_VALUES = PRODUCTION_TABS.map((tab) => tab.value);

export function productionTypesForTab(tab) {
  if (!tab || tab === "all") return null;
  return PRODUCTION_TABS.find((item) => item.value === tab)?.types ?? null;
}

// Linked income transactions reuse the seeded transaction categories so the
// ledger stays category-driven. wool/honey/other fall back to income_other.
export const PRODUCTION_INCOME_CATEGORY = {
  milk: "milk",
  egg: "egg",
  meat: "meat",
  manure: "manure",
  wool: "income_other",
  honey: "income_other",
  other: "income_other",
};
