// Built-in ledger types. Mirrors the CHECK constraint on transactions.type.
export const TRANSACTION_TYPES = [
  { value: "income", label: "আয়" },
  { value: "expense", label: "খরচ" },
];

export const TYPE_LABELS = Object.fromEntries(
  TRANSACTION_TYPES.map((item) => [item.value, item.label])
);
