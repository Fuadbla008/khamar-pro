"use client";

import { useEffect, useState } from "react";

// Used to pick a Dialog on desktop and a bottom Sheet on mobile. Rendering only
// one at a time avoids two Radix portals fighting over focus/scroll.
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
