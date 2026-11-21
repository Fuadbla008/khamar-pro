// Assignable roles in invite/update flows. Only `create_farm` makes an owner;
// these flows must never offer or set `owner`.
export const ROLES = [
  { value: "manager", label: "ম্যানেজার" },
  { value: "member", label: "সদস্য" },
];

// Keep the owner label for displaying existing owner memberships.
export const ROLE_LABELS = {
  owner: "মালিক",
  ...Object.fromEntries(ROLES.map((item) => [item.value, item.label])),
};

export const PERMISSIONS = [
  { key: "can_manage_animals", label: "পশু ব্যবস্থাপনা" },
  { key: "can_manage_transactions", label: "লেনদেন ব্যবস্থাপনা" },
  { key: "can_manage_categories", label: "ক্যাটাগরি ব্যবস্থাপনা" },
  { key: "can_manage_fields", label: "অতিরিক্ত ঘর ব্যবস্থাপনা" },
  { key: "can_manage_members", label: "সদস্য ব্যবস্থাপনা" },
  { key: "can_manage_settings", label: "সেটিংস ব্যবস্থাপনা" },
];

export function permissionsFromFormData(formData) {
  const selected = formData.getAll("permissions").map(String);

  return Object.fromEntries(
    PERMISSIONS.map((item) => [item.key, selected.includes(item.key)])
  );
}
