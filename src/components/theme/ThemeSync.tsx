"use client";

import { useEffect } from "react";

// Reapplies the saved theme after the page loads.
export function ThemeSync() {
  useEffect(() => {
    const saved = localStorage.getItem("chae-theme");
    if (saved === "dark" || saved === "light") {
      document.documentElement.dataset.theme = saved;
    }
  }, []);

  return null;
}
