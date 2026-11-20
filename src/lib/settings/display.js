export const DISPLAY_SETTINGS_KEY = "display";

// app_settings is a generic key/value table; the display row is the only one
// used in Phase 0-2. Keep the default in one place for server and client.
export function banglaDigitsFromSettings(rows) {
  const row = (rows ?? []).find((item) => item.key === DISPLAY_SETTINGS_KEY);
  return Boolean(row?.value?.bangla_digits);
}
