import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnimalForm } from "@/components/forms/animal-form";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { loadAnimalDefinitions } from "@/lib/fields/load";

export const metadata = { title: "পশু সম্পাদনা — Khamar" };

export default function EditAnimalPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <EditAnimalRoute params={params} />
    </Suspense>
  );
}

async function EditAnimalRoute({ params }) {
  const { farmId, animalId } = await params;
  const { supabase } = await requireFarmAccess(farmId);

  const [{ data: animal }, definitions] = await Promise.all([
    supabase
      .from("animals")
      .select("*")
      .eq("id", animalId)
      .eq("farm_id", farmId)
      .is("deleted_at", null)
      .maybeSingle(),
    loadAnimalDefinitions(supabase, farmId),
  ]);

  if (!animal) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <Card className="rounded-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl">পশু সম্পাদনা করুন</CardTitle>
          <CardDescription>ট্যাগ নম্বর: {animal.tag_no}</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimalForm
            farmId={farmId}
            animal={animal}
            definitions={definitions}
          />
        </CardContent>
      </Card>
    </main>
  );
}
