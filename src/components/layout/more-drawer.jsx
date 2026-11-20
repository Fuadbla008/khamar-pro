"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, LogOut } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { signOutAction } from "@/lib/auth/actions";
import {
  COMING_SOON_NAV,
  MODULE_NAV,
  PRIMARY_NAV,
  SECONDARY_NAV,
  farmPath,
} from "./nav-items";

export function MoreDrawer({ open, onOpenChange, farmId }) {
  const pathname = usePathname();

  function section(title, items) {
    return (
      <div className="space-y-1">
        <p className="px-2 text-xs font-medium text-muted-foreground">{title}</p>
        {items.map((item) => {
          const href = farmPath(farmId, item.href);
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              onClick={() => onOpenChange(false)}
              className={cn(
                "press flex min-h-12 items-center gap-3 rounded-input px-3 text-sm font-medium",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-card"
      >
        <SheetHeader>
          <SheetTitle>আরও</SheetTitle>
          <SheetDescription>খামারের অন্যান্য অংশ</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 pb-4">
          {section("মেনু", PRIMARY_NAV)}
          {section("মডিউল", MODULE_NAV)}
          {section("ব্যবস্থাপনা", SECONDARY_NAV)}

          <div className="space-y-1">
            <p className="px-2 text-xs font-medium text-muted-foreground">
              শীঘ্রই আসছে
            </p>
            {COMING_SOON_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex min-h-12 items-center gap-3 rounded-input px-3 text-sm text-muted-foreground/60"
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <Lock className="size-3.5 shrink-0" />
                </div>
              );
            })}
          </div>

          <form action={signOutAction} className="border-t border-border pt-4">
            <Button
              type="submit"
              variant="ghost"
              className="press min-h-12 w-full justify-start gap-3 rounded-input text-muted-foreground"
            >
              <LogOut className="size-5" />
              লগআউট
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
