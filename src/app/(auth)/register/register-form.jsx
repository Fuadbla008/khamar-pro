"use client";

import { useActionState } from "react";
import { LanguageToggle } from "@/components/domain/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "@/lib/auth/actions";

export function RegisterForm({ next, inviteCode = "" }) {
  const [state, formAction, pending] = useActionState(signUpAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="inviteCode" value={inviteCode} />

      <div className="flex justify-end">
        <LanguageToggle />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">পুরো নাম</Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          className="h-11 rounded-input"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">ফোন নম্বর</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          className="h-11 rounded-input"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">ইমেইল</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="h-11 rounded-input"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">পাসওয়ার্ড</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="h-11 rounded-input"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">কমপক্ষে ৮ অক্ষর</p>
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state?.success ? (
        <p role="status" className="text-sm text-success">
          {state.success}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="press h-11 w-full rounded-input"
      >
        {pending ? "অপেক্ষা করুন..." : "অ্যাকাউন্ট তৈরি করুন"}
      </Button>
    </form>
  );
}
