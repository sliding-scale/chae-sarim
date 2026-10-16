"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useCallback, useEffect, useState } from "react";
import { cn } from "cn";

type Theme = "light" | "dark";

// Reads the theme already applied on this browser.
function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// Remembers light or dark mode and applies it on this browser.
function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  localStorage.setItem("chae-theme", next);
}

// Sun and moon switch for the dashboard color theme.
const ThemeSwitch = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const [checked, setChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setChecked(currentTheme() === "dark");
  }, []);

  const handleCheckedChange = useCallback((isChecked: boolean) => {
    setChecked(isChecked);
    applyTheme(isChecked ? "dark" : "light");
  }, []);

  if (!mounted) {
    return <div className={cn("theme-switch", className)} aria-hidden />;
  }

  return (
    <div className={cn("theme-switch", className)} {...props}>
      <Switch
        checked={checked}
        onCheckedChange={handleCheckedChange}
        aria-label="Dark mode"
        className="theme-switch-control"
      />
      <span className="theme-switch-icon theme-switch-icon-sun">
        <SunIcon size={16} className="theme-switch-sun" />
      </span>
      <span className="theme-switch-icon theme-switch-icon-moon">
        <MoonIcon
          size={16}
          fill={checked ? "#FFFFFF" : "#000000"}
          className="theme-switch-moon"
        />
      </span>
    </div>
  );
};

export default ThemeSwitch;
