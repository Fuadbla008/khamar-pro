"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { cleanFieldValues, initialFieldValues } from "@/lib/fields/resolve";
import { schemaFromFields } from "@/lib/fields/schema";
import { FieldRenderer } from "./field-renderer";

export function DynamicForm({
  action,
  definitions = [],
  defaultValues = {},
  children,
  submitLabel = "সংরক্ষণ করুন",
  pendingLabel = "অপেক্ষা করুন...",
  disabled = false,
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [values, setValues] = useState(() =>
    initialFieldValues(definitions, defaultValues)
  );
  const [localError, setLocalError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();

    const cleaned = cleanFieldValues(values);
    const result = schemaFromFields(definitions).safeParse(cleaned);

    if (!result.success) {
      setLocalError(result.error.issues[0].message);
      return;
    }

    setLocalError(null);
    formAction(new FormData(event.currentTarget));
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
