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
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { JoinClient } from "./join-client";

export const metadata = { title: "খামারে যোগ দিন — Khamar" };

export default function JoinPage({ params }) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-muted" />}>
      <JoinContent params={params} />
    </Suspense>
  );
}

async function JoinContent({ params }) {
  // Supabase Auth reads Date.now() for token expiry; defer before prerender.
  await connection();

  const { code } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/register?next=${encodeURIComponent(`/join/${code}`)}`);
  }

  return (
    <Card className="rounded-card shadow-soft">
      <CardHeader>
        <CardTitle className="text-2xl">খামারে যোগ দিন</CardTitle>
        <CardDescription>আপনার আমন্ত্রণ কোড যাচাই করা হচ্ছে</CardDescription>
      </CardHeader>
      <CardContent>
        <JoinClient code={code} />
      </CardContent>
    </Card>
  );
}
