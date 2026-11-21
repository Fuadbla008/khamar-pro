import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewFarmForm } from "@/components/domain/new-farm-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "নতুন খামার — Khamar" };
export const instant = false;

export default function NewFarmPage() {
  return (
    <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-card bg-muted" />}>
      <NewFarmContent />
    </Suspense>
  );
}

async function NewFarmContent() {
  // The Supabase client reads token expiry via Date.now() when created, which
  // is an unstable prerender value under cacheComponents. Bail out before
  // creating it; the session is request-bound regardless.
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/farms/new");
  }

  // Same seeded global animal categories onboarding uses — never code literals.
  const { data: categories } = await supabase
    .from("categories")
    .select("code, name_bn, icon")
    .is("farm_id", null)
    .eq("entity", "animal")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
      <Card className="rounded-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl">নতুন খামার তৈরি করুন</CardTitle>
          <CardDescription>বিদ্যমান খামারের পাশাপাশি একটি নতুন খামার যোগ করুন</CardDescription>
        </CardHeader>
        <CardContent>
          <NewFarmForm types={categories ?? []} />
        </CardContent>
      </Card>
    </main>
  );
}
