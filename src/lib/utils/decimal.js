// Small integer-only helpers for numeric(12,2) values. All parsing happens on
// strings so money never accumulates binary floating-point error in app code.

export function decimalToCents(value) {
  const text = String(value ?? "0").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error("Invalid decimal value");
  }

  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
}

export function centsToDecimal(cents) {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = absolute % 100n;
  const text = `${whole}.${String(fraction).padStart(2, "0")}`;
  return negative ? `-${text}` : text;
}

// Multiplies two 2-decimal numbers and rounds half-up to 2 decimals.
export function multiplyDecimal(left, right) {
  const product = decimalToCents(left) * decimalToCents(right); // scale 10,000
  return centsToDecimal((product + 50n) / 100n);
}

export function sumDecimal(values) {
  let total = 0n;
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    total += decimalToCents(value);
  }
  return centsToDecimal(total);
}
