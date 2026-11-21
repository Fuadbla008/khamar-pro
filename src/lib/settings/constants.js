// Entities whose categories and custom fields the owner can manage in the UI.
// All production configuration (including custom fields) is now live.
export const CONFIGURABLE_ENTITIES = [
  { value: "animal", label: "পশু" },
  { value: "transaction", label: "লেনদেন" },
  { value: "inventory", label: "ইনভেন্টরি" },
  { value: "health", label: "স্বাস্থ্য" },
  { value: "production", label: "উৎপাদন" },
];

// Kept as an empty array so the settings UI can keep rendering the
// "শীঘ্রই" section slot without hardcoding a special case.
export const COMING_SOON_ENTITIES = [];

export const ENTITY_LABELS = Object.fromEntries(
  [...CONFIGURABLE_ENTITIES, ...COMING_SOON_ENTITIES].map((item) => [
    item.value,
    item.label,
  ])
);

// Mirrors the CHECK constraint on field_definitions.type.
export const FIELD_TYPES = [
  { value: "text", label: "লেখা" },
  { value: "number", label: "সংখ্যা" },
  { value: "date", label: "তারিখ" },
  { value: "select", label: "একটি নির্বাচন" },
  { value: "multiselect", label: "একাধিক নির্বাচন" },
  { value: "boolean", label: "হ্যাঁ / না" },
  { value: "file", label: "ফাইলের লিংক" },
];

export const TRANSACTION_TYPE_OPTIONS = [
  { value: "income", label: "আয়" },
  { value: "expense", label: "খরচ" },
];

export const MAX_FIELDS_PER_ENTITY = 25;