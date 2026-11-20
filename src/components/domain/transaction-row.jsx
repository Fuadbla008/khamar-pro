import { formatDate, formatMoney } from "@/lib/utils/format";

export function TransactionRow({
  transaction,
  categoryLabel,
  actions,
  banglaDigits = false,
}) {
  const isIncome = transaction.type === "income";

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-xl text-base font-semibold ${
          isIncome ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        }`}
        aria-hidden
      >
        {isIncome ? "+" : "−"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {categoryLabel ?? transaction.category_code}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(transaction.date, { banglaDigits })}
          {transaction.note ? ` · ${transaction.note}` : ""}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          isIncome ? "text-success" : "text-foreground"
        }`}
      >
        {isIncome ? "+" : "−"}
        {formatMoney(transaction.amount, { banglaDigits })}
      </span>
      {actions ? <div className="flex shrink-0 gap-1">{actions}</div> : null}
    </li>
  );
}
