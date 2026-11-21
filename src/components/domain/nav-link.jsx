"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function NavLink({
  href,
  children,
  onMouseEnter,
  onFocus,
  "aria-label": ariaLabel,
  ...props
}) {
  const router = useRouter();
  const label = ariaLabel ?? (typeof children === "string" ? children : undefined);

  function prefetch() {
    if (typeof href === "string" && href) router.prefetch(href);
  }

  return (
    <Link
      href={href}
      aria-label={label}
      onMouseEnter={(event) => {
        prefetch();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetch();
        onFocus?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
