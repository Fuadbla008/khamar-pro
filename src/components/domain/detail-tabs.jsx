"use client";

import { useState } from "react";
import { cn } from "cn";

// Server-rendered panels are passed in as `content`, so this only handles the
// active-tab switch. This keeps the heavy reads on the server.
export function DetailTabs({ tabs }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto border-b border-border" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "press min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium",
              active === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}
