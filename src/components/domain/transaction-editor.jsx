"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TransactionForm } from "@/components/forms/transaction-form";

export function TransactionEditor({ mode, open, onOpenChange, formProps }) {
  const title = formProps.transaction
    ? "লেনদেন সম্পাদনা করুন"
    : "নতুন লেনদেন";
  const description = formProps.transaction
    ? "লেনদেনের তথ্য হালনাগাদ করুন"
    : "খরচ বা আয়ের বিবরণ দিন";
  const form = <TransactionForm {...formProps} />;

  if (mode === "sheet") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-card"
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 pb-4">{form}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
