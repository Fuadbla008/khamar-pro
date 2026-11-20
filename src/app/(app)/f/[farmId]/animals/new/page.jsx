import { Suspense } from "react";
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

export const metadata = { title: "নতুন পশু — Khamar" };

export default function NewAnimalPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <NewAnimalRoute params={params} />
    </Suspense>
  );
}

async function NewAnimalRoute({ params }) {
  const { farmId } = await params;
  const { supabase } = await requireFarmAccess(farmId);
  const definitions = await loadAnimalDefinitions(supabase, farmId);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <Card className="rounded-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl">নতুন পশু যোগ করুন</CardTitle>
          <CardDescription>
            মূল তথ্যের সাথে প্রয়োজনীয় অতিরিক্ত তথ্যও পূরণ করুন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimalForm farmId={farmId} definitions={definitions} />
        </CardContent>
      </Card>
    </main>
  );
}
