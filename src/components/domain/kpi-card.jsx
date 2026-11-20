import { Card, CardContent } from "@/components/ui/card";

const TONES = {
  default: "text-foreground",
  success: "text-success",
  danger: "text-destructive",
  warning: "text-warning",
};

export function KpiCard({ label, value, hint, tone = "default", icon: Icon }) {
  return (
    <Card className="rounded-card shadow-soft">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={`text-xl font-semibold tabular-nums ${TONES[tone]}`}>
            {value}
          </p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
