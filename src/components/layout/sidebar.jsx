"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Lock } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  COMING_SOON_NAV,
  MODULE_NAV,
  PRIMARY_NAV,
  SECONDARY_NAV,
  farmPath,
} from "./nav-items";

function NavGroup({ title, items, farmId, pathname, collapsed }) {
  return (
    <div className="space-y-1">
      {!collapsed ? (
        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      ) : null}
      {items.map((item) => {
        const href = farmPath(farmId, item.href);
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={href}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "press flex min-h-11 items-center gap-3 rounded-input px-3 text-sm font-medium",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <Icon className="size-5 shrink-0" />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar({ farmId, collapsed, onToggle }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card transition-[width] duration-200 md:flex",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2 border-b border-border px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-input bg-primary text-lg font-bold text-primary-foreground">
          খ
        </span>
        {!collapsed ? (
          <span className="text-lg font-bold tracking-tight">Khamar</span>
        ) : null}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        <NavGroup
          title="মেনু"
          items={PRIMARY_NAV}
          farmId={farmId}
          pathname={pathname}
          collapsed={collapsed}
        />
        <NavGroup
          title="মডিউল"
          items={MODULE_NAV}
          farmId={farmId}
          pathname={pathname}
          collapsed={collapsed}
        />
        <NavGroup
          title="ব্যবস্থাপনা"
          items={SECONDARY_NAV}
          farmId={farmId}
          pathname={pathname}
          collapsed={collapsed}
        />

        <div className="space-y-1">
          {!collapsed ? (
            <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              শীঘ্রই আসছে
            </p>
          ) : null}
          {COMING_SOON_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                title={collapsed ? `${item.label} — শীঘ্রই আসছে` : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-input px-3 text-sm text-muted-foreground/60",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="size-5 shrink-0" />
                {!collapsed ? (
                  <>
                    <span className="truncate">{item.label}</span>
                    <Lock className="ml-auto size-3.5 shrink-0" />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onToggle}
          aria-label={collapsed ? "সাইডবার প্রসারিত করুন" : "সাইডবার সংকুচিত করুন"}
          className={cn(
            "press min-h-11 w-full gap-2 rounded-input text-sm text-muted-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <>
              <ChevronsLeft className="size-4" />
              সংকুচিত করুন
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
