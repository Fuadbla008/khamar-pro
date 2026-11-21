// Shared CSV serializer. Kept framework-free so both Server Actions and the
// browser downloader can use it.

const MONEY_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function formatCSVDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  // Supabase dates/timestamps are ISO strings. Slice first so a timestamp's
  // timezone cannot shift the displayed day.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
}

function formatCell(value, format) {
  if (value === null || value === undefined) return "";

  if (format === "date") return formatCSVDate(value);
  if (format === "boolean") return value ? "হ্যাঁ" : "না";

  if (format === "money" || format === "number") {
    if (value === "") return "";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return (format === "money" ? MONEY_FORMATTER : NUMBER_FORMATTER).format(numeric);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? NUMBER_FORMATTER.format(value) : "";
  }
  if (typeof value === "boolean") return value ? "হ্যাঁ" : "না";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// columns: [{ key, label, format?: "text" | "money" | "number" | "date" | "boolean" }]
// meta: optional string (or array of strings) written as full rows above the
// column header, e.g. a report's filter summary.
export function toCSV(rows = [], columns = [], meta = null) {
  if (!columns.length) return "\ufeff";

  const lines = [];
  if (meta) {
    for (const line of Array.isArray(meta) ? meta : [meta]) {
      if (line) lines.push(escapeCell(line));
    }
  }
  lines.push(
    columns.map((column) => escapeCell(column.label ?? column.key)).join(",")
  );

  for (const row of rows) {
    lines.push(
      columns
        .map((column) => escapeCell(formatCell(row?.[column.key], column.format)))
        .join(",")
    );
  }

  // The BOM is essential for Excel to render Bengali correctly.
  return `\ufeff${lines.join("\r\n")}`;
}
