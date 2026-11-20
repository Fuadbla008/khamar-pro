import { Suspense } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "লগইন — Khamar" };

export default function LoginPage({ searchParams }) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-card bg-muted" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }) {
  const { next } = await searchParams;

  return (
    <Card className="rounded-card shadow-soft">
      <CardHeader>
        <CardTitle className="text-2xl">আবার স্বাগতম</CardTitle>
        <CardDescription>আপনার খামারে লগইন করুন</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={typeof next === "string" ? next : "/"} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          অ্যাকাউন্ট নেই?{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            নিবন্ধন করুন
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
