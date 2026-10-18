"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const publicPaths = new Set(["/", "/documentation", "/privacy", "/terms"]);

// Reapplies the saved theme after navigation. Public pages stay light together.
export function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (publicPaths.has(pathname)) {
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
