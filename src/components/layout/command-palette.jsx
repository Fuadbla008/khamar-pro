"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ALL_NAV, farmPath } from "./nav-items";

export function CommandPalette({ open, onOpenChange, farmId }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const results = ALL_NAV.filter(
    (item) => !term || item.label.includes(term) || item.href.includes(term)
  );

  function go(item) {
    onOpenChange(false);
    setQuery("");
    router.push(farmPath(farmId, item.href));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>দ্রুত নেভিগেশন</DialogTitle>
          <DialogDescription>পাতা খুঁজে বেছে নিন</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="পাতার নাম লিখুন..."
            className="h-14 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length ? (
            <ul className="space-y-1">
              {results.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <button
                      type="button"
                      onClick={() => go(item)}
                      className={cn(
                        "press flex min-h-12 w-full items-center gap-3 rounded-input px-3 text-left text-sm hover:bg-muted"
                      )}
                    >
                      <Icon className="size-5 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              কোনো পাতা পাওয়া যায়নি
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
