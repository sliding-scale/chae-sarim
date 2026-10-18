"use client";

import { Menu } from "lucide-react";

// Renders the dashboard title bar.
export function DashboardTopbar({
  title,
  menuOpen,
  onMenu,
}: {
  title: string;
  menuOpen: boolean;
  onMenu: () => void;
}) {
  return (
    <header className="dashboard-topbar">
      <div className="dashboard-heading">
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? "Collapse navigation" : "Expand navigation"}
          aria-expanded={menuOpen}
          onClick={onMenu}
        >
          <Menu size={18} />
        </button>
        {title ? <h1 className="dashboard-title">{title}</h1> : null}
      </div>
    </header>
  );
}
