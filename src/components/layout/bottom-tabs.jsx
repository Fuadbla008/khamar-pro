"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Ellipsis,
  HeartPulse,
  Package,
  PawPrint,
  Plus,
  LayoutDashboard,
  Wallet,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MODULE_NAV, SECONDARY_NAV, farmPath } from "./nav-items";

function Tab({ href, label, icon: Icon, active }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="size-5" />
      <span>{label}</span>
    </Link>
  );
}

export function BottomTabs({ farmId, onOpenMore }) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);

  const is = (href) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = [...MODULE_NAV, ...SECONDARY_NAV].some((item) =>
    is(farmPath(farmId, item.href))
  );

  return (
    <>
      <nav
        aria-label="প্রধান নেভিগেশন"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <Tab
          href={farmPath(farmId, "dashboard")}
          label="ড্যাশবোর্ড"
          icon={LayoutDashboard}
          active={is(farmPath(farmId, "dashboard"))}
        />
        <Tab
          href={farmPath(farmId, "animals")}
          label="পশু"
          icon={PawPrint}
          active={is(farmPath(farmId, "animals"))}
        />

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="নতুন যোগ করুন"
            className="press -mt-6 grid size-14 place-items-center rounded-pill bg-primary text-primary-foreground shadow-lg"
          >
            <Plus className="size-6" />
          </button>
        </div>

        <Tab
          href={farmPath(farmId, "transactions")}
          label="লেনদেন"
          icon={Wallet}
          active={is(farmPath(farmId, "transactions"))}
        />
        <button
          type="button"
          onClick={onOpenMore}
          aria-current={moreActive ? "page" : undefined}
          className={cn(
            "press flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
            moreActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Ellipsis className="size-5" />
          আরও
        </button>
      </nav>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>নতুন যোগ করুন</DialogTitle>
            <DialogDescription>কী তথ্য দিতে চান?</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button asChild className="press h-12 w-full rounded-input">
              <Link
                href={farmPath(farmId, "animals/new")}
                onClick={() => setAddOpen(false)}
              >
                <PawPrint className="size-4" />
                নতুন পশু
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="press h-12 w-full rounded-input"
            >
              <Link
                href={farmPath(farmId, "transactions")}
                onClick={() => setAddOpen(false)}
              >
                <Wallet className="size-4" />
                নতুন লেনদেন
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="press h-12 w-full rounded-input"
            >
              <Link
                href={farmPath(farmId, "inventory/new")}
                onClick={() => setAddOpen(false)}
              >
                <Package className="size-4" />
                নতুন আইটেম
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="press h-12 w-full rounded-input"
            >
              <Link
                href={farmPath(farmId, "health")}
                onClick={() => setAddOpen(false)}
              >
                <HeartPulse className="size-4" />
                স্বাস্থ্য রেকর্ড
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
