import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnimalStatusActions } from "@/components/domain/animal-status-actions";
import { DetailTabs } from "@/components/domain/detail-tabs";
import { EmptyState } from "@/components/domain/empty-state";
import { FirstAnimalCelebration } from "@/components/domain/first-animal-celebration";
import { HealthTimeline } from "@/components/domain/health-timeline";
import { ConfirmSubmit } from "@/components/forms/confirm-submit";
import { deleteAnimalAction } from "@/lib/animals/actions";
import { GENDER_LABELS, STATUS_LABELS } from "@/lib/animals/constants";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { getCategoryLabels } from "@/lib/categories/labels";
import { loadAnimalDefinitions } from "@/lib/fields/load";
import { banglaDigitsFromSettings } from "@/lib/settings/display";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const metadata = { title: "পশুর বিবরণ — Khamar" };

export default function AnimalDetailPage({ params, searchParams }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <AnimalDetailRoute params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function displayValue(definition, value) {
  if (value === undefined || value === null || value === "") return "—";
  if (definition.type === "boolean") return value ? "হ্যাঁ" : "না";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function DetailRow({ label, value }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value || "—"}</dd>
    </div>
  );
}

async function AnimalDetailRoute({ params, searchParams }) {
  const [{ farmId, animalId }, query] = await Promise.all([params, searchParams]);
  const celebrateFirstAnimal = query?.first === "1";
  const { supabase } = await requireFarmAccess(farmId);

  const [
    { data: animal },
    definitions,
    categoryLabels,
    settingsResult,
    healthResult,
    medicineResult,
  ] = await Promise.all([
    supabase
      .from("animals")
      .select("*")
      .eq("id", animalId)
      .eq("farm_id", farmId)
      .is("deleted_at", null)
      .maybeSingle(),
    loadAnimalDefinitions(supabase, farmId),
    getCategoryLabels(supabase, farmId, "animal"),
    supabase.from("app_settings").select("key, value").eq("farm_id", farmId),
    // Missing table (migration 0011 not applied yet) is treated as no records.
    supabase
      .from("health_records")
      .select("*")
      .eq("farm_id", farmId)
      .eq("animal_id", animalId)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("inventory_items")
      .select("id, name_bn")
      .eq("farm_id", farmId)
      .eq("category_code", "medicine")
      .is("deleted_at", null),
  ]);

  const banglaDigits = banglaDigitsFromSettings(settingsResult.data);

  if (!animal) notFound();

  const categoryLabel =
    categoryLabels.get(animal.category_code) ?? animal.category_code;

  const builtInRows = [
    { label: "ট্যাগ নম্বর", value: animal.tag_no },
    { label: "নাম", value: animal.name },
    { label: "ধরন", value: categoryLabel },
    { label: "লিঙ্গ", value: GENDER_LABELS[animal.gender] },
    { label: "জন্ম তারিখ", value: formatDate(animal.dob, { banglaDigits }) },
    {
      label: "ক্রয় তারিখ",
      value: formatDate(animal.purchase_date, { banglaDigits }),
    },
    {
      label: "ক্রয় মূল্য",
      value: animal.purchase_price
        ? formatMoney(animal.purchase_price, { banglaDigits })
        : "—",
    },
    { label: "অবস্থা", value: STATUS_LABELS[animal.status] ?? animal.status },
  ];

  const customRows = definitions
    .map((definition) => ({
      definition,
      value: displayValue(definition, animal.custom_fields?.[definition.key]),
    }))
    .filter((row) => row.value !== "—");

  const healthRecords = healthResult.data ?? [];
  const medicines = medicineResult.data ?? [];

  const detailsPanel = (
    <Card className="rounded-card shadow-soft">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-xl">{animal.tag_no}</CardTitle>
            {animal.name ? (
              <p className="mt-1 text-sm text-muted-foreground">{animal.name}</p>
            ) : null}
          </div>
          <Badge
            variant={animal.status === "sick" ? "destructive" : "secondary"}
            className="shrink-0 rounded-pill"
          >
            {STATUS_LABELS[animal.status] ?? animal.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {builtInRows.map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </dl>

        {customRows.length ? (
          <section className="space-y-3 border-t border-border pt-5">
            <h2 className="text-sm font-semibold">অতিরিক্ত তথ্য</h2>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {customRows.map(({ definition, value }) => (
                <DetailRow
                  key={definition.id}
                  label={definition.label_bn || definition.label}
                  value={value}
                />
              ))}
            </dl>
          </section>
        ) : null}

        {animal.photo_url ? (
          <a
            href={animal.photo_url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ছবি দেখুন
          </a>
        ) : null}
      </CardContent>
    </Card>
  );

  const healthPanel = healthRecords.length ? (
    <HealthTimeline
      records={healthRecords}
      medicines={medicines}
      banglaDigits={banglaDigits}
    />
  ) : (
    <div className="rounded-card border border-border bg-card">
      <EmptyState
        title="এখনো কোনো স্বাস্থ্য রেকর্ড নেই"
        description="টিকা বা চিকিৎসার তথ্য যোগ করলে এখানে দেখা যাবে।"
      />
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <FirstAnimalCelebration trigger={celebrateFirstAnimal} />
      <DetailTabs
        tabs={[
          { key: "details", label: "বিবরণ", content: detailsPanel },
          { key: "health", label: "স্বাস্থ্য", content: healthPanel },
        ]}
      />

      <div className="flex flex-wrap gap-3">
        <Button asChild className="press h-11 rounded-input">
          <Link href={`/f/${farmId}/animals/${animalId}/edit`}>
            সম্পাদনা করুন
          </Link>
        </Button>
        <Button asChild variant="outline" className="press h-11 rounded-input">
          <Link href={`/f/${farmId}/animals`}>তালিকায় ফিরুন</Link>
        </Button>
        <AnimalStatusActions
          farmId={farmId}
          animalId={animal.id}
          status={animal.status}
          tagNo={animal.tag_no}
          variant="detail"
        />
        <form action={deleteAnimalAction}>
          <input type="hidden" name="farmId" value={farmId} />
          <input type="hidden" name="animalId" value={animal.id} />
          <ConfirmSubmit
            label="পশু মুছুন"
            confirmText={`${animal.tag_no} কে মুছে ফেলতে চান?`}
          />
        </form>
      </div>
    </main>
  );
}
