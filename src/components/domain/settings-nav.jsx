"use client";

import { usePathname } from "next/navigation";
import { cn } from "cn";
import { NavLink } from "./nav-link";

export function SettingsNav({ farmId }) {
  const pathname = usePathname();
  const base = `/f/${farmId}/settings`;

  const links = [
    { href: base, label: "সাধারণ", exact: true },
    { href: `${base}/categories`, label: "ক্যাটাগরি" },
    { href: `${base}/fields`, label: "অতিরিক্ত ঘর" },
    { href: `${base}/export`, label: "এক্সপোর্ট ও ব্যাকআপ" },
  ];

  return (
    <nav
      aria-label="সেটিংস বিভাগ"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
    >
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <NavLink
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "press flex min-h-11 shrink-0 items-center rounded-input border px-4 text-sm font-medium",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
