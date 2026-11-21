// Display labels for system-generated transaction categories. Seeded rows live
// in SQL and farm overrides win, but these keep reports/ledger readable if a
// farm has deactivated or deleted its copy of a system category.
export const TRANSACTION_CATEGORY_LABEL_FALLBACKS = {
  animal_purchase: "পশু ক্রয়",
};
