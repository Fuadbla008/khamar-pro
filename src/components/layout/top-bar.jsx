"use client";

import { LogOut, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import { FarmSwitcher } from "./farm-switcher";

function initialsOf(name) {
  const parts = String(name ?? "ব্যবহারকারী").trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]).join("") || "ব্য";
}

export function TopBar({
  farmId,
  farms,
  userName,
  onOpenCommand,
  onOpenMenu,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-3 md:px-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenMenu}
          aria-label="মেনু খুলুন"
          className="press size-11 md:hidden"
        >
          <Menu className="size-5" />
        </Button>

        <FarmSwitcher farmId={farmId} farms={farms} />

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            onClick={onOpenCommand}
            className="press hidden h-10 items-center gap-2 rounded-input px-3 text-sm text-muted-foreground sm:flex"
          >
            <Search className="size-4" />
            খুঁজুন
            <kbd className="ml-3 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
              Ctrl K
            </kbd>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenCommand}
            aria-label="খুঁজুন"
            className="press size-11 sm:hidden"
          >
            <Search className="size-5" />
          </Button>

          <span
            className="grid size-9 shrink-0 place-items-center rounded-pill bg-secondary text-xs font-semibold"
            title={userName ?? ""}
          >
            {initialsOf(userName)}
          </span>

          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="লগআউট"
              title="লগআউট"
              className="press size-11 text-muted-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
