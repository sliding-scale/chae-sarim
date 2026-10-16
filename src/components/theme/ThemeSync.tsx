"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Reapplies the saved theme after navigation. The landing page stays light.
export function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/") {
      delete document.documentElement.dataset.theme;
      return;
    }
    const saved = localStorage.getItem("chae-theme");
    if (saved === "dark" || saved === "light") {
      document.documentElement.dataset.theme = saved;
    }
  }, [pathname]);

  return null;
}
