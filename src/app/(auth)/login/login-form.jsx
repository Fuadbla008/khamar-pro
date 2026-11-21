"use client";

import { useActionState } from "react";
import { LanguageToggle } from "@/components/domain/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "@/lib/auth/actions";

export function LoginForm({ next }) {
  const [state, formAction, pending] = useActionState(signInAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="flex justify-end">
        <LanguageToggle />
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
          autoComplete="current-password"
          className="h-11 rounded-input"
          required
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="press h-11 w-full rounded-input"
      >
        {pending ? "অপেক্ষা করুন..." : "লগইন"}
      </Button>
    </form>
  );
}
