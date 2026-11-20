"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { joinFarmAction } from "@/lib/auth/actions";

export function JoinClient({ code }) {
  const [state, formAction, pending] = useActionState(joinFarmAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="code" value={code} />

      <div className="space-y-2">
        <Label htmlFor="code">ইনভাইট কোড</Label>
        <Input
          id="code"
          value={code}
          readOnly
          className="h-11 rounded-input font-mono uppercase"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        এই কোডটি ব্যবহার করে আপনি খামারের সদস্য হবেন। কোডের মেয়াদ ৭ দিন।
      </p>

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
        {pending ? "যোগ করা হচ্ছে..." : "খামারে যোগ দিন"}
      </Button>
    </form>
  );
}
