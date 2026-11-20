import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InventoryForm } from "@/components/forms/inventory-form";
import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import { loadInventoryDefinitions } from "@/lib/fields/load";

export const metadata = { title: "নতুন আইটেম — Khamar" };

export default function NewInventoryItemPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <NewInventoryItemRoute params={params} />
    </Suspense>
  );
}

async function NewInventoryItemRoute({ params }) {
  const { farmId } = await params;
  const { supabase } = await requireFarmAccess(farmId);
  const definitions = await loadInventoryDefinitions(supabase, farmId);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <Card className="rounded-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl">নতুন আইটেম</CardTitle>
          <CardDescription>
            স্টক রাখার জন্য আইটেমের তথ্য দিন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryForm farmId={farmId} definitions={definitions} />
        </CardContent>
      </Card>
    </main>
  );
}
