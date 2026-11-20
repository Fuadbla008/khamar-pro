import { Suspense } from "react";
import { notFound } from "next/navigation";
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

export const metadata = { title: "আইটেম সম্পাদনা — Khamar" };

export default function EditInventoryItemPage({ params }) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-card bg-muted" />}>
      <EditInventoryItemRoute params={params} />
    </Suspense>
  );
}

async function EditInventoryItemRoute({ params }) {
  const { farmId, itemId } = await params;
  const { supabase } = await requireFarmAccess(farmId);

  const [{ data: item }, definitions] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("*")
      .eq("id", itemId)
      .eq("farm_id", farmId)
      .is("deleted_at", null)
      .maybeSingle(),
    loadInventoryDefinitions(supabase, farmId),
  ]);

  if (!item) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <Card className="rounded-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl">আইটেম সম্পাদনা</CardTitle>
          <CardDescription>{item.name_bn}</CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryForm
            farmId={farmId}
            item={item}
            definitions={definitions}
          />
        </CardContent>
      </Card>
    </main>
  );
}
