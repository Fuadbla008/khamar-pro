import { Suspense } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata = { title: "নিবন্ধন — Khamar" };

function inviteCodeFromNext(value) {
  if (typeof value !== "string") return "";
  const match = value.match(/^\/join\/([^/?#]+)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export default function RegisterPage({ searchParams }) {
  return (
    <Suspense fallback={<div className="h-[28rem] animate-pulse rounded-card bg-muted" />}>
      <RegisterContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RegisterContent({ searchParams }) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : "/";

  return (
    <Card className="rounded-card shadow-soft">
      <CardHeader>
        <CardTitle className="text-2xl">নতুন অ্যাকাউন্ট</CardTitle>
        <CardDescription>নাম, ফোন, ইমেইল ও পাসওয়ার্ড দিন</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm
          next={nextPath}
          inviteCode={inviteCodeFromNext(nextPath)}
        />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            লগইন করুন
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
