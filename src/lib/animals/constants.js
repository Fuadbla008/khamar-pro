// Built-in enum labels for the animal entity. These mirror the CHECK
// constraints in 0001_schema.sql and are not owner-configurable categories.
export const GENDERS = [
  { value: "male", label: "পুরুষ" },
  { value: "female", label: "মাদি" },
  { value: "unknown", label: "অজানা" },
];

export const STATUSES = [
  { value: "active", label: "সক্রিয়" },
  { value: "sick", label: "অসুস্থ" },
  { value: "sold", label: "বিক্রীত" },
  { value: "dead", label: "মৃত" },
  { value: "transferred", label: "স্থানান্তরিত" },
];

export const GENDER_LABELS = Object.fromEntries(
  GENDERS.map((item) => [item.value, item.label])
);

export const STATUS_LABELS = Object.fromEntries(
  STATUSES.map((item) => [item.value, item.label])
);
