"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { BottomTabs } from "./bottom-tabs";
import { CommandPalette } from "./command-palette";
import { MoreDrawer } from "./more-drawer";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export function AppShell({ farmId, farms, userName, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar
        farmId={farmId}
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />

      <div
        className={cn(
          "min-h-dvh transition-[padding] duration-200",
          collapsed ? "md:pl-20" : "md:pl-64"
        )}
      >
        <TopBar
          farmId={farmId}
          farms={farms}
          userName={userName}
          onOpenCommand={() => setCommandOpen(true)}
          onOpenMenu={() => setMoreOpen(true)}
        />
        <div className="pb-28 md:pb-8">{children}</div>
      </div>

      <BottomTabs farmId={farmId} onOpenMore={() => setMoreOpen(true)} />
      <MoreDrawer farmId={farmId} open={moreOpen} onOpenChange={setMoreOpen} />
      <CommandPalette
        farmId={farmId}
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />
    </div>
  );
}
