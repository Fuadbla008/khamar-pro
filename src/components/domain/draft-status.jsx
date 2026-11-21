"use client";

import { useEffect, useRef, useState } from "react";
import { CloudUpload, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDrafts } from "@/hooks/use-drafts";

export function DraftStatus({ farmId }) {
  const { pendingCount, online, syncing, error, syncDrafts } = useDrafts(farmId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const previousOnline = useRef(online);
  const countLabel = new Intl.NumberFormat("bn-BD").format(pendingCount);

  useEffect(() => {
    // Connection restored: prompt, but never sync until the farmer confirms.
    if (online && !previousOnline.current && pendingCount > 0) {
      setDialogOpen(true);
    }
    previousOnline.current = online;
  }, [online, pendingCount]);

  async function handleConfirm() {
    setDialogOpen(false);
    await syncDrafts();
  }

  if (pendingCount === 0 && online) return null;

  return (
    <>
      <Button
        type="button"
        variant={online ? "secondary" : "outline"}
        size="sm"
        onClick={() => {
          if (!online) {
            toast("ইন্টারনেট সংযোগ নেই, ড্রাফটগুলো পরে সিঙ্ক হবে");
            return;
          }
          setDialogOpen(true);
        }}
        aria-label={
          online
            ? `${countLabel}টি অসিঙ্ক করা ড্রাফট আছে, সিঙ্ক করতে ক্লিক করুন`
            : `ইন্টারনেট সংযোগ নেই, ${countLabel}টি ড্রাফট সেভ করা আছে`
        }
        className="press h-10 gap-1.5 rounded-input px-2.5 text-xs"
      >
        {online ? (
          <CloudUpload className="size-4" aria-hidden />
        ) : (
          <WifiOff className="size-4" aria-hidden />
        )}
        <span className="tabular-nums">{countLabel}</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>সেভ করা ড্রাফটগুলো সিঙ্ক করবেন?</DialogTitle>
            <DialogDescription>
              {countLabel}টি ড্রাফট সার্ভারে পাঠানো হবে। আপনার অনুমতি ছাড়া কোনো
              ড্রাফট সিঙ্ক করা হবে না।
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={syncing}
              onClick={() => setDialogOpen(false)}
            >
              না, পরে
            </Button>
            <Button
              type="button"
              disabled={syncing}
              onClick={handleConfirm}
            >
              {syncing ? "সিঙ্ক হচ্ছে..." : "হ্যাঁ, সিঙ্ক করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
