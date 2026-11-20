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
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "খামার তৈরি করুন — Khamar" };
export const instant = false;

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-card bg-muted" />}>
      <OnboardingContent />
    </Suspense>
  );
}

async function OnboardingContent() {
  // Supabase's auth client reads token expiry via Date.now() when it is created.
  // Under cacheComponents that is an unstable prerender value, so stop
  // prerendering before creating the client. The session is request-bound anyway.
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const { data: memberships } = await supabase
    .from("farm_members")
    .select("farm_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1);

  if (memberships?.length) {
    redirect(`/f/${memberships[0].farm_id}/dashboard`);
  }

  // Farm types come from seeded global categories, never from code literals.
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
          <CardTitle className="text-2xl">আপনার খামার তৈরি করুন</CardTitle>
          <CardDescription>প্রথমে খামারের কিছু তথ্য দিন</CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm types={categories ?? []} />
        </CardContent>
      </Card>
    </main>
  );
}
