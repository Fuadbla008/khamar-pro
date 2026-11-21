function safeSegment(value, fallback) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return cleaned || fallback;
}

// Farm names are often Bengali, so a Latin slug can legitimately be empty.
// Fall back to a short farm-id fragment instead of producing "__" filenames.
export function slugifyFarmName(name, farmId) {
  const latin = String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return safeSegment(latin || `farm-${String(farmId ?? "").slice(0, 8)}`, "farm");
}

// {entity}_{farmSlug}_{from}_{to}.csv
export function exportFilename(entity, farmSlug, from, to) {
  const safeEntity = safeSegment(entity, "export").replace(/-/g, "_");
  const safeFarm = safeSegment(farmSlug, "farm");
  const safeFrom = safeSegment(from, "all");
  const safeTo = safeSegment(to, "all");

  return `${safeEntity}_${safeFarm}_${safeFrom}_${safeTo}.csv`;
}
