// Owners bypass every permission check; managers/members use their jsonb grants.
// The same rule is enforced by is_farm_member() in RLS on the database side.
export function can(role, permissions, permissionKey) {
  return role === "owner" || Boolean(permissions?.[permissionKey]);
}
