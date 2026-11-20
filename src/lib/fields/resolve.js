// Field and category definitions are seeded globally, then copied per farm.
// A farm-scoped row with the same key/code replaces its global template.
export function resolveDefinitions(rows, farmId, keyField = "key") {
  const resolved = new Map();

  for (const row of rows ?? []) {
    if (row.farm_id === null) {
      resolved.set(row[keyField], row);
    }
  }

  for (const row of rows ?? []) {
    if (row.farm_id === farmId) {
      resolved.set(row[keyField], row);
    }
  }

  return [...resolved.values()].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
}

export function initialFieldValues(definitions = [], defaults = {}) {
  const values = {};

  for (const def of definitions) {
    const existing = defaults[def.key];
    if (existing !== undefined && existing !== null) {
      values[def.key] = existing;
      continue;
    }

    if (def.type === "multiselect") {
      values[def.key] = [];
    } else if (def.type === "boolean") {
      values[def.key] = false;
    } else if (def.default_value !== null && def.default_value !== undefined) {
      values[def.key] = def.default_value;
    } else {
      values[def.key] = "";
    }
  }

  return values;
}

export function cleanFieldValues(values = {}) {
  const cleaned = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === "" || value === null || value === undefined) continue;
    cleaned[key] = value;
  }

  return cleaned;
}
