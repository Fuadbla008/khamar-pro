"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useInvalidateDisplaySettings } from "@/hooks/use-display-settings";
import {
  archiveFarmAction,
  updateFarmSettingsAction,
} from "@/lib/settings/actions";
import { formatDate } from "@/lib/utils/format";

export function GeneralSettings({
  farmId,
  farm,
  banglaDigits,
  isOwner,
  canManageSettings,
}) {
  const router = useRouter();
  const invalidateDisplay = useInvalidateDisplaySettings();
  const [state, action, pending] = useActionState(updateFarmSettingsAction, null);
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveFarmAction,
    null
  );
  const [digits, setDigits] = useState(banglaDigits);

  useEffect(() => {
    if (state?.ok) {
      invalidateDisplay(farmId);
      router.refresh();
    }
  }, [state, invalidateDisplay, farmId, router]);

  const canEditGeneral = canManageSettings;

  return (
    <>
      <Card className="rounded-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">খামারের তথ্য</CardTitle>
          <CardDescription>
            {isOwner
              ? "খামারের নাম ও ঠিকানা শুধু মালিক বদলাতে পারেন"
              : "আপনি শুধু প্রদর্শনের সেটিংস বদলাতে পারেন"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-5">
            <input type="hidden" name="farmId" value={farmId} />

            <div className="space-y-2">
              <Label htmlFor="farm-name">খামারের নাম</Label>
              <Input
                id="farm-name"
                name="name"
                defaultValue={farm?.name ?? ""}
                disabled={!isOwner}
                className="h-11 rounded-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="farm-address">ঠিকানা</Label>
              <Input
                id="farm-address"
                name="address"
                defaultValue={farm?.address ?? ""}
                disabled={!isOwner}
                className="h-11 rounded-input"
              />
            </div>

            <div className="space-y-1 rounded-input bg-muted/60 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">প্রধান ধরন</span>
                <span className="font-medium">{farm?.primary_type ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">মুদ্রা</span>
                <span className="font-medium">{farm?.currency ?? "BDT"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">তৈরি হয়েছে</span>
                <span className="font-medium tabular-nums">
                  {formatDate(farm?.created_at?.slice(0, 10))}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-input border border-border p-3">
              <div className="space-y-1">
                <Label htmlFor="bangla-digits">বাংলা অঙ্ক প্রদর্শন</Label>
                <p className="text-xs text-muted-foreground">
                  চালু রাখলে টাকার অঙ্ক বাংলা অক্ষরে দেখা যাবে, যেমন
                  ৳১২,৫০০.০০। বন্ধ রাখলে ইংরেজি অঙ্ক দেখা যাবে।
                </p>
              </div>
              <Switch
                id="bangla-digits"
                checked={digits}
                onCheckedChange={setDigits}
                disabled={!canEditGeneral}
              />
              <input
                type="hidden"
                name="banglaDigits"
                value={digits ? "on" : ""}
              />
            </div>

            {state?.error || archiveState?.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state?.error || archiveState?.error}
              </p>
            ) : null}

            {canEditGeneral || isOwner ? (
              <Button
                type="submit"
                disabled={pending}
                className="press h-11 w-full rounded-input sm:w-auto"
              >
                {pending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="rounded-card border-destructive/30 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              খামার আর্কাইভ
            </CardTitle>
            <CardDescription>
              আর্কাইভ করলে খামারের সব তথ্য অদৃশ্য হয়ে যাবে। কোনো তথ্য মুছে
              ফেলা হবে না, তবে সদস্যরা আর প্রবেশ করতে পারবেন না। এই কাজ ফেরত
              নেওয়া যাবে না।
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={archiveAction} className="space-y-4">
              <input type="hidden" name="farmId" value={farmId} />
              <input type="hidden" name="farmName" value={farm?.name ?? ""} />
              <div className="space-y-2">
                <Label htmlFor="archive-confirmation">
                  নিশ্চিত করতে খামারের নাম টাইপ করুন: {farm?.name}
                </Label>
                <Input
                  id="archive-confirmation"
                  name="confirmation"
                  autoComplete="off"
                  className="h-11 rounded-input"
                  required
                />
              </div>
              <Button
                type="submit"
                variant="destructive"
                disabled={archivePending}
                className="press h-11 rounded-input"
                onClick={(event) => {
                  if (
                    !window.confirm(
                      "আপনি কি নিশ্চিত যে খামারটি আর্কাইভ করবেন? ফেরত আনা যাবে না।"
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                {archivePending ? "আর্কাইভ হচ্ছে..." : "খামার আর্কাইভ করুন"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
