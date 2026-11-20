import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/forms/confirm-submit";
import { deleteHealthRecordAction } from "@/lib/health/actions";
import { dueWindowDates, healthTypeMeta } from "@/lib/health/constants";
import { formatDate, formatMoney } from "@/lib/utils/format";

function isSoon(dateString, window) {
  if (!dateString) return false;
  return dateString >= window.start && dateString <= window.end;
}

export function HealthTimeline({
  records = [],
  animals = [],
  medicines = [],
  banglaDigits = false,
  onEdit,
}) {
  const animalById = new Map(animals.map((animal) => [animal.id, animal]));
  const medicineById = new Map(medicines.map((item) => [item.id, item]));
  const window = dueWindowDates();

  const groups = [];
  for (const record of records) {
    const date = String(record.date ?? "").slice(0, 10);
    let group = groups.find((entry) => entry.date === date);
    if (!group) {
      group = { date, records: [] };
      groups.push(group);
    }
    group.records.push(record);
  }
  groups.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.date} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {formatDate(group.date, { banglaDigits }) || "—"}
          </h3>
          <ul className="space-y-2">
            {group.records.map((record) => {
              const meta = healthTypeMeta(record.type);
              const Icon = meta.icon;
              const animal = record.animal_id
                ? animalById.get(record.animal_id)
                : null;
              const medicine = record.medicine_item_id
                ? medicineById.get(record.medicine_item_id)
                : null;
              const soon = isSoon(record.next_due_date, window);

              return (
                <li
                  key={record.id}
                  className="rounded-card border border-border bg-card p-3 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-input bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="rounded-pill px-2 py-0 text-[11px]"
                        >
                          {meta.label}
                        </Badge>
                        {animal ? (
                          <span className="truncate text-xs font-semibold">
                            {animal.tag_no}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">সব পশু</span>
                        )}
                      </div>
                      <p className="mt-1.5 break-words text-sm font-medium">
                        {record.title}
                      </p>
                      {medicine ? (
                        <p className="text-xs text-muted-foreground">
                          ঔষধ: {medicine.name_bn}
                          {record.dosage ? ` · ${record.dosage}` : ""}
                        </p>
                      ) : record.dosage ? (
                        <p className="text-xs text-muted-foreground">
                          মাত্রা: {record.dosage}
                        </p>
                      ) : null}
                      {record.notes ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {record.notes}
                        </p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold tabular-nums">
                          {formatMoney(record.cost, { banglaDigits })}
                        </span>
                        {!record.is_done ? (
                          <Badge
                            variant="outline"
                            className="rounded-pill px-2 py-0 text-[10px]"
                          >
                            নির্ধারিত
                          </Badge>
                        ) : null}
                        {record.next_due_date ? (
                          <Badge
                            variant={soon ? "destructive" : "secondary"}
                            className="rounded-pill px-2 py-0 text-[10px]"
                          >
                            পরবর্তী: {formatDate(record.next_due_date, { banglaDigits })}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {onEdit ? (
                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-border pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(record)}
                        className="press min-h-10"
                      >
                        <Pencil className="size-3.5" />
                        সম্পাদনা
                      </Button>
                      <form action={deleteHealthRecordAction}>
                        <input type="hidden" name="farmId" value={record.farm_id} />
                        <input type="hidden" name="recordId" value={record.id} />
                        <ConfirmSubmit
                          label="মুছুন"
                          confirmText="এই রেকর্ডটি মুছে ফেলতে চান?"
                          className="press min-h-10 text-destructive"
                        />
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
