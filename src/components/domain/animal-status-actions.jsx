"use client";

import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/animals/constants";
import {
  markAnimalActiveAction,
  markAnimalDeadAction,
  markAnimalSickAction,
  markAnimalSoldAction,
  markAnimalTransferredAction,
} from "@/lib/health/actions";

const STATUS_ACTIONS = {
  active: markAnimalActiveAction,
  sick: markAnimalSickAction,
  sold: markAnimalSoldAction,
  dead: markAnimalDeadAction,
  transferred: markAnimalTransferredAction,
};

// Ordered to match STATUSES in @/lib/animals/constants.
const STATUS_ORDER = ["active", "sick", "sold", "dead", "transferred"];

export function AnimalStatusActions({
  farmId,
  animalId,
  status,
  tagNo,
  variant = "table",
}) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const compact = variant === "table";
  const detail = variant === "detail";

  function changeStatus(nextStatus) {
    const action = STATUS_ACTIONS[nextStatus];
    if (!action || nextStatus === status) return;

    if (
      nextStatus === "dead" &&
      !window.confirm(`${tagNo} কে মৃত হিসেবে চিহ্নিত করবেন?`)
    ) {
      return;
    }

    const formData = new FormData();
    formData.set("farmId", farmId);
    formData.set("animalId", animalId);

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["animals", farmId] });
      queryClient.invalidateQueries({ queryKey: ["health", farmId] });
    });
  }

  return (
    <div
      className={cn("flex flex-wrap gap-1", compact && "justify-end", detail && "gap-2")}
      aria-label={`${tagNo} অবস্থা পরিবর্তন`}
    >
      {STATUS_ORDER.filter((value) => value !== status).map((value) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={value === "dead" ? "ghost" : "outline"}
          disabled={pending}
          onClick={() => changeStatus(value)}
          className={cn(
            "press",
            compact ? "min-h-9 px-2 text-xs" : "min-h-11 text-xs",
            value === "dead" && "text-destructive",
            detail && "h-11 px-3 text-sm"
          )}
        >
          {STATUS_LABELS[value]}
        </Button>
      ))}
    </div>
  );
}
