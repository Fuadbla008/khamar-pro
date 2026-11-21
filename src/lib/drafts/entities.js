export const DRAFT_ENTITY_LABELS = {
  animal: "পশু",
  inventory: "ইনভেন্টরি",
  health: "স্বাস্থ্য",
  production: "উৎপাদন",
  transaction: "লেনদেন",
};

export function draftEntityLabel(entity) {
  return DRAFT_ENTITY_LABELS[entity] ?? entity ?? "অজানা";
}

// Actions that redirect after a successful create resolve the client call
// without a result object. Keep them last when replaying so other drafts get
// their chance to sync before the browser navigates away.
export const REDIRECTING_DRAFT_ENTITIES = ["animal", "inventory"];
