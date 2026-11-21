"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const FarmOwnerContext = createContext(false);

export function FarmOwnerProvider({ isOwner = false, children }) {
  return (
    <FarmOwnerContext.Provider value={isOwner}>
      {children}
    </FarmOwnerContext.Provider>
  );
}

export function FarmSwitcher({ farmId, farms }) {
  const router = useRouter();
  const canAddFarm = useContext(FarmOwnerContext);
  const [open, setOpen] = useState(false);
  const current = farms.find((farm) => farm.id === farmId);

  function select(id) {
    setOpen(false);
    if (id !== farmId) {
      router.push(`/f/${id}/dashboard`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="press h-11 max-w-[15rem] justify-start gap-2 rounded-input px-2 sm:px-3"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-input bg-primary text-sm font-bold text-primary-foreground">
            খ
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[10px] font-normal text-muted-foreground">
              বর্তমান খামার
            </span>
            <span className="block truncate text-sm font-semibold">
              {current?.name ?? "খামার"}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>খামার বদলান</DialogTitle>
          <DialogDescription>আপনি যে খামারগুলোর সদস্য</DialogDescription>
        </DialogHeader>
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {farms.map((farm) => (
            <li key={farm.id}>
              <button
                type="button"
                onClick={() => select(farm.id)}
                className={cn(
                  "press flex min-h-12 w-full items-center gap-3 rounded-input border px-3 text-left",
                  farm.id === farmId
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted"
                )}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {farm.name}
                </span>
                {farm.id === farmId ? (
                  <Check className="size-4 shrink-0 text-primary" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        {canAddFarm ? (
          <Button
            asChild
            variant="outline"
            className="press mt-2 h-11 w-full rounded-input"
          >
            <Link href="/farms/new" onClick={() => setOpen(false)}>
              <Plus className="size-4" />
              নতুন খামার
            </Link>
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
