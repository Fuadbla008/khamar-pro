"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDrafts } from "@/hooks/use-drafts";
import { cleanFieldValues, initialFieldValues } from "@/lib/fields/resolve";
import { schemaFromFields } from "@/lib/fields/schema";
import { formDataToObject } from "@/lib/drafts/serialize";
import { FieldRenderer } from "./field-renderer";

const OFFLINE_DRAFT_MESSAGE = "ইন্টারনেট নেই — ড্রাফটে সেভ হয়েছে";
const DRAFT_SAVE_FAILED_MESSAGE = "ড্রাফট সেভ করা যায়নি, আবার চেষ্টা করুন";

function isRedirectError(error) {
  return (
    typeof error?.digest === "string" && error.digest.includes("NEXT_REDIRECT")
  );
}

export function DynamicForm({
  action,
  definitions = [],
  defaultValues = {},
  children,
  submitLabel = "সংরক্ষণ করুন",
  pendingLabel = "অপেক্ষা করুন...",
  disabled = false,
  draftEntity,
  onOfflineDraft,
}) {
  const [values, setValues] = useState(() =>
    initialFieldValues(definitions, defaultValues)
  );
  const [localError, setLocalError] = useState(null);
  const { saveDraftFromForm } = useDrafts(undefined, { watch: false });

  async function persistDraft(formData) {
    const payload = formDataToObject(formData);

    try {
      if (typeof onOfflineDraft === "function") {
        await onOfflineDraft(payload);
      } else if (draftEntity) {
        await saveDraftFromForm(draftEntity, payload);
      } else {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async function handleOfflineDraft(formData) {
    const saved = await persistDraft(formData);
    if (saved) {
      toast(OFFLINE_DRAFT_MESSAGE);
    } else {
      toast.error(DRAFT_SAVE_FAILED_MESSAGE);
    }
    return saved;
  }

  const [state, formAction, pending] = useActionState(
    async (previousState, formData) => {
      try {
        return await action(previousState, formData);
      } catch (caught) {
        if (isRedirectError(caught)) throw caught;
        await handleOfflineDraft(formData);
        return { error: OFFLINE_DRAFT_MESSAGE };
      }
    },
    null
  );

  async function handleSubmit(event) {
    event.preventDefault();

    const cleaned = cleanFieldValues(values);
    const result = schemaFromFields(definitions).safeParse(cleaned);

    if (!result.success) {
      setLocalError(result.error.issues[0].message);
      return;
    }

    setLocalError(null);
    const formData = new FormData(event.currentTarget);

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      await handleOfflineDraft(formData);
      return;
    }

    formAction(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {typeof children === "function" ? children() : children}

      {definitions.length ? (
        <fieldset className="space-y-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-semibold">অতিরিক্ত তথ্য</legend>
          {definitions.map((definition) => (
            <FieldRenderer
              key={definition.id}
              definition={definition}
              value={values[definition.key]}
              onChange={(next) =>
                setValues((previous) => ({
                  ...previous,
                  [definition.key]: next,
                }))
              }
            />
          ))}
        </fieldset>
      ) : null}

      <input
        type="hidden"
        name="custom_fields"
        value={JSON.stringify(cleanFieldValues(values))}
      />

      {localError || state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {localError || state?.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || disabled}
        className="press h-11 w-full rounded-input"
      >
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
