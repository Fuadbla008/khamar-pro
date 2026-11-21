const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBanglaDigits(value) {
  return String(value).replace(/\d/g, (digit) => BANGLA_DIGITS[Number(digit)]);
}

export function formatMoney(value, { banglaDigits = false } = {}) {
  const amount = Number(value ?? 0);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `৳${banglaDigits ? toBanglaDigits(formatted) : formatted}`;
}

// Stock counts are quantities, not money: no ৳ prefix and no forced decimals.
export function formatQuantity(value, { banglaDigits = false } = {}) {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

  return banglaDigits ? toBanglaDigits(formatted) : formatted;
}

// English digits/dates are the default. Bengali locale (and its digits) is opt-in.
export function formatDate(value, { banglaDigits = false } = {}) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(banglaDigits ? "bn-BD" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}
