import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageToggle } from "@/components/domain/language-toggle";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default function LandingPage() {
  return (
    <Suspense fallback={<LandingView />}>
      <LandingGate />
    </Suspense>
  );
}

async function LandingGate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingView />;
  }

  const { data: memberships } = await supabase
    .from("farm_members")
    .select("farm_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1);

  if (!memberships?.length) {
    redirect("/onboarding");
  }

  redirect(`/f/${memberships[0].farm_id}/dashboard`);
}

function LandingView() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <div className="mb-6 grid size-16 place-items-center rounded-3xl bg-primary text-3xl font-bold text-primary-foreground shadow-soft">
        খ
      </div>
      <h1 className="text-4xl font-bold tracking-tight">Khamar</h1>
      <p className="mt-3 max-w-md text-lg text-muted-foreground">
        বাংলাদেশের খামারির জন্য সহজ খামার ব্যবস্থাপনা — পশু, লেনদেন ও দল এক
        জায়গায়।
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Button asChild className="press h-12 rounded-input">
          <Link href="/register">শুরু করুন</Link>
        </Button>
        <Button asChild variant="outline" className="press h-12 rounded-input">
          <Link href="/login">লগইন</Link>
        </Button>
      </div>
    </main>
  );
}
