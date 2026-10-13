"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardTopbar, titleFor } from "@/components/layout/DashboardTopbar";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import type { AppRole } from "@/lib/navigation";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Wraps a dashboard page with the sidebar and top bar.
export function DashboardShell({
  role,
  name,
  tenantName,
  children,
}: {
  role: AppRole;
  name: string;
  tenantName: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <ConfirmProvider>
      <div className="dashboard-shell">
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          hidden={!open}
          onClick={() => setOpen(false)}
        />
        <AppSidebar
          role={role}
          name={name}
          tenantName={tenantName}
          open={open}
          onNavigate={() => setOpen(false)}
        />
        <div className="dashboard-main">
          <DashboardTopbar
            title={titleFor(pathname, role)}
            role={role}
            name={name}
            menuOpen={open}
            onMenu={() => setOpen((value) => !value)}
          />
          <div className="dashboard-content">{children}</div>
        </div>
      </div>
    </ConfirmProvider>
  );
}
