import { createAnimalAction } from "@/lib/animals/actions";
import { createHealthRecordAction } from "@/lib/health/actions";
import { createItemAction } from "@/lib/inventory/actions";
import { createProductionAction } from "@/lib/production/actions";
import { createTransactionAction } from "@/lib/transactions/actions";
import { objectToFormData } from "./serialize";

// Every create action used by the offline queue. Most follow the
// useActionState signature (prevState, formData); transactions take formData
// directly, so the registry records which calling convention to use.
const DRAFT_ACTIONS = {
  animal: { action: createAnimalAction, withState: true },
  inventory: { action: createItemAction, withState: true },
  health: { action: createHealthRecordAction, withState: true },
  production: { action: createProductionAction, withState: true },
  transaction: { action: createTransactionAction, withState: false },
};

export function isRedirectError(error) {
  const digest = typeof error?.digest === "string" ? error.digest : "";
  return digest.includes("NEXT_REDIRECT");
}

export function actionResultError(result) {
  if (result && typeof result === "object" && result.error) {
    return String(result.error);
  }
  return null;
}

export async function replayDraft(draft) {
  const entry = DRAFT_ACTIONS[draft?.entity];
  if (!entry) {
    return { ok: false, error: "এই ড্রাফটের ধরন চেনা যায়নি" };
  }

  const formData = objectToFormData(draft.formData ?? {});
  const result = entry.withState
    ? await entry.action(null, formData)
    : await entry.action(formData);

  const error = actionResultError(result);
  if (error) return { ok: false, error };

  return { ok: true };
}
