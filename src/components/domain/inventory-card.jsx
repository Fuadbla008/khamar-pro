import Link from "next/link";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatQuantity } from "@/lib/utils/format";

export function isLowStock(item) {
  return Number(item.current_stock ?? 0) <= Number(item.min_stock ?? 0);
}

export function InventoryCard({
  item,
  categoryLabel,
  onAdd,
  onUse,
  banglaDigits = false,
}) {
  const low = isLowStock(item);
  const totalValue = Number(item.current_stock ?? 0) * Number(item.unit_price ?? 0);

  return (
    <li
      className={cn(
        "rounded-card border bg-card p-4 shadow-soft",
        low ? "border-destructive" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          href={item.id}
          className="min-w-0 flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
        >
          <p className="truncate font-semibold">{item.name_bn}</p>
          <p className="truncate text-sm text-muted-foreground">
            {categoryLabel ?? "—"} · {item.unit}
          </p>
        </Link>
        {low ? (
          <Badge variant="destructive" className="shrink-0 rounded-pill">
            ⚠ কম স্টক
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {formatQuantity(item.current_stock, { banglaDigits })}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {item.unit}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            ন্যুনতম {formatQuantity(item.min_stock, { banglaDigits })}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>একক {item.unit_price ? formatMoney(item.unit_price, { banglaDigits }) : "—"}</p>
          <p>মোট {item.unit_price ? formatMoney(totalValue, { banglaDigits }) : "—"}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onAdd}
          className="press min-h-11 rounded-input"
        >
          + যোগ
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onUse}
          className="press min-h-11 rounded-input"
        >
          − ব্যবহার
        </Button>
      </div>
    </li>
  );
}
