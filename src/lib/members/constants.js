// Built-in roles mirror the CHECK constraint on farm_members.role.
// Permission keys mirror the second argument of is_farm_member().
export const ROLES = [
  { value: "owner", label: "মালিক" },
  { value: "manager", label: "ম্যানেজার" },
  { value: "member", label: "সদস্য" },
];

export const ROLE_LABELS = Object.fromEntries(
  ROLES.map((item) => [item.value, item.label])
);

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
