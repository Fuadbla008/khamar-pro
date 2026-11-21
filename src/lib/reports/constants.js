// Shared report vocabulary. No category/role labels live here: those come from
// farm configuration and are passed in by the page.

export const REPORT_TABS = [
  { value: "summary", label: "সারাংশ", entity: "report-summary", filename: "report_summary" },
  { value: "userwise", label: "সদস্য ওয়ারি", entity: "report-userwise", filename: "report_userwise" },
  { value: "animalwise", label: "পশু ওয়ারি", entity: "report-animalwise", filename: "report_animalwise" },
  { value: "categorywise", label: "ক্যাটাগরি ওয়ারি", entity: "report-categorywise", filename: "report_categorywise" },
  { value: "detail", label: "বিস্তারিত", entity: "report-detail", filename: "report_detail" },
];

export const REPORT_TAB_VALUES = REPORT_TABS.map((tab) => tab.value);

export function reportTab(value) {
  return REPORT_TABS.find((tab) => tab.value === value) ?? REPORT_TABS[0];
}

export const DATE_PRESETS = [
  { value: "today", label: "আজ" },
  { value: "this_week", label: "এই সপ্তাহ" },
  { value: "this_month", label: "এই মাস" },
  { value: "this_year", label: "এই বছর" },
  { value: "custom", label: "কাস্টম" },
];

export const DATE_PRESET_VALUES = DATE_PRESETS.map((preset) => preset.value);

function iso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Used only in the client for URL filter defaults. Server Actions always
// receive explicit from/to values, so there is no server/client date drift.
export function dateRangeForPreset(preset) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (preset === "today") {
    return { from: iso(end), to: iso(end) };
  }

  if (preset === "this_week") {
    // Bangladesh working week starts on Sunday (getDay() === 0).
    const start = new Date(end);
    start.setDate(start.getDate() - start.getDay());
    const close = new Date(start);
    close.setDate(close.getDate() + 6);
    return { from: iso(start), to: iso(close) };
  }

  if (preset === "this_year") {
    return {
      from: `${end.getFullYear()}-01-01`,
      to: `${end.getFullYear()}-12-31`,
    };
  }

  // "this_month" is the default and also the fallback for custom (where the
  // explicit from/to inputs take over in the view).
  return {
    from: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-01`,
    to: iso(new Date(end.getFullYear(), end.getMonth() + 1, 0)),
  };
}

// CSV meta rows use the DD/MM/YYYY form from the spec, with English digits.
export function formatFilterDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function reportMeta({ label, from, to, farmName }) {
  const range = `${formatFilterDate(from) || "—"} - ${formatFilterDate(to) || "—"}`;
  return `রিপোর্ট: ${label} | তারিখ: ${range} | খামার: ${farmName || ""}`.trim();
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#7BA7C7",
  "#B0533C",
  "#9CA3AF",
];

export function chartColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length];
}
