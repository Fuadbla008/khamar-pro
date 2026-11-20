import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/animals/constants";
import { formatDate, formatMoney } from "@/lib/utils/format";

export function AnimalCard({
  animal,
  categoryLabel,
  onDelete,
  onSick,
  onDead,
  banglaDigits = false,
}) {
  return (
    <li className="rounded-card border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={animal.id}
          className="min-w-0 flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
        >
          <p className="truncate font-semibold">{animal.tag_no}</p>
          <p className="truncate text-sm text-muted-foreground">
            {animal.name || categoryLabel || "—"}
          </p>
        </Link>
        <Badge
          variant={animal.status === "sick" ? "destructive" : "secondary"}
          className="shrink-0 rounded-pill"
        >
          {STATUS_LABELS[animal.status] ?? animal.status}
        </Badge>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{categoryLabel ?? "—"}</span>
        <span className="tabular-nums">
          {animal.purchase_price
            ? formatMoney(animal.purchase_price, { banglaDigits })
            : "—"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-3">
        <span className="mr-auto text-xs text-muted-foreground">
          {formatDate(animal.purchase_date || animal.created_at?.slice(0, 10), {
            banglaDigits,
          })}
        </span>
        {animal.status !== "dead" ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSick?.(animal)}
              className="press min-h-11 text-xs"
            >
              অসুস্থ
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDead?.(animal)}
              className="press min-h-11 text-xs"
            >
              মৃত
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(animal)}
          className="press min-h-11 text-destructive"
        >
          মুছুন
        </Button>
      </div>
    </li>
  );
}
