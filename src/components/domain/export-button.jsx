"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toCSV } from "@/lib/export/csv";
import { downloadCSV } from "@/lib/export/download";
import { exportFilename } from "@/lib/export/filename";
import { buildExport } from "@/lib/export/builders";

const MODES = [
  { value: "current", label: "বর্তমান ফিল্টার" },
  { value: "all", label: "সব ডেটা" },
  { value: "range", label: "তারিখ রেঞ্জ" },
];

const ALL_MODE_VALUES = MODES.map((item) => item.value);

export function ExportButton({
  farmId,
  entity,
  filters = {},
  filename,
  farmSlug,
  label = "CSV",
  disabled = false,
  // Reports pass their already-visible rows so the CSV matches the screen
  // exactly. Other pages keep the server-side builder path.
  data = null,
  meta = null,
  modes = ALL_MODE_VALUES,
}) {
  const [mode, setMode] = useState(modes[0] ?? "current");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleExport() {
    if (busy || disabled) return;

    let effectiveFilters;
    let filenameFrom = from;
    let filenameTo = to;

    if (mode === "all") {
      effectiveFilters = { ...filters, allData: true };
      filenameFrom = "all";
      filenameTo = "all";
    } else if (mode === "range") {
      if (!from || !to) {
        setError("শুরু ও শেষ তারিখ নির্বাচন করুন");
        return;
      }
      effectiveFilters = { ...filters, allData: false, from, to };
    } else {
      effectiveFilters = { ...filters, allData: false };
      filenameFrom = filters.from ?? "";
      filenameTo = filters.to ?? "";
    }

    setBusy(true);
    setError(null);
    try {
      let columns;
      let rows;
      if (mode === "current" && data) {
        columns = data.columns ?? [];
        rows = data.rows ?? [];
      } else {
        ({ columns, rows } = await buildExport(farmId, entity, effectiveFilters));
      }
      const csv = toCSV(rows, columns, meta);
      const name = exportFilename(
        filename ?? entity,
        farmSlug ?? farmId,
        filenameFrom,
        filenameTo
      );
      downloadCSV(name, csv);
    } catch {
      setError("রপ্তানি করা যায়নি, আবার চেষ্টা করুন");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {modes.length > 1 ? (
        <Select value={mode} onValueChange={setMode} disabled={busy || disabled}>
          <SelectTrigger
            className="h-11 w-[170px] rounded-input"
            aria-label="রপ্তানির ধরন"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.filter((item) => modes.includes(item.value)).map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {mode === "range" ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-11 w-[150px] rounded-input"
            aria-label="শুরুর তারিখ"
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-11 w-[150px] rounded-input"
            aria-label="শেষ তারিখ"
          />
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        onClick={handleExport}
        disabled={busy || disabled}
        className="press h-11 rounded-input"
      >
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {busy ? "অপেক্ষা করুন..." : label}
      </Button>

      {error ? (
        <p role="alert" className="w-full text-right text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
