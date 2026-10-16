"use client";

import { ChangePassword } from "@/components/auth/ChangePassword";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import type { AppRole } from "@/lib/navigation";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";

// Wraps a dashboard page with the sidebar and top bar.
export function DashboardShell({
  role,
  name,
  tenantName,
  tenantImageUrl,
  imageUrl,
  children,
}: {
  role: AppRole;
  name: string;
  tenantName: string | null;
  tenantImageUrl: string | null;
  imageUrl: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { isLoaded, user } = useUser();
  const metadata = user?.publicMetadata as { mustChangePassword?: boolean } | undefined;
  const mustChangePassword = isLoaded && metadata?.mustChangePassword === true;

  return (
    <ConfirmProvider>
      <div className="dashboard-shell dashboard-app">
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
          tenantImageUrl={tenantImageUrl}
          imageUrl={imageUrl}
          open={open}
          onNavigate={() => setOpen(false)}
        />
        <div className="dashboard-main">
          <DashboardTopbar
            title={mustChangePassword ? "Choose a password" : ""}
            menuOpen={open}
            onMenu={() => setOpen((value) => !value)}
          />
          <div className="dashboard-content">
            {!isLoaded ? (
              <p className="invite-note">Loading your account…</p>
            ) : mustChangePassword ? (
              <div className="profile-layout">
                <ChangePassword />
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </ConfirmProvider>
  );
}
