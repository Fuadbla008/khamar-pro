"use client";

import { Button } from "@/components/ui/button";

// Lets a Server Component keep `action={serverAction}` on the form while the
// confirmation prompt itself runs on the client.
export function ConfirmSubmit({
  label,
  confirmText,
  className = "press min-h-11",
}) {
  return (
    <Button
      type="submit"
      variant="destructive"
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmText)) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </Button>
  );
}
