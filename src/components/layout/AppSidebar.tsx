"use client";

import { CompanyMark } from "@/components/brand/CompanyMark";
import { Logo } from "@/components/brand/Logo";
import { UserAvatar } from "@/components/users/UserAvatar";
import { homeFor, navigationFor, type AppRole } from "@/lib/navigation";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Renders the dashboard sidebar for the signed-in role.
export function AppSidebar({
  role,
  name,
  tenantName,
  tenantImageUrl,
  imageUrl,
  open,
  onNavigate,
}: {
  role: AppRole;
  name: string;
  tenantName: string | null;
  tenantImageUrl: string | null;
  imageUrl: string | null;
  open: boolean;
  onNavigate: () => void;
}) {
  const { user } = useUser();
  const pathname = usePathname();
  const home = homeFor(role);
  const sections = navigationFor(role);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const profileHref = role === "admin" ? "/dashboard/admin/profile" : "/dashboard/worker/profile";

  useEffect(() => {
    // Closes the account menu when the pointer lands outside it.
    function onPointer(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    }
    // Closes the account menu when Escape is pressed.
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <aside className={open ? "app-sidebar is-open" : "app-sidebar"}>
      <div className="sidebar-logo">
        <Logo href={home} />
      </div>
      {tenantName ? (
        <div className="sidebar-workspace">
          <span className="sidebar-workspace-mark" aria-hidden="true">
            <CompanyMark imageUrl={tenantImageUrl} size={14} />
          </span>
          <span className="sidebar-workspace-copy">
            <span>Workspace</span>
            <strong>{tenantName}</strong>
          </span>
        </div>
      ) : null}
      <nav className="sidebar-nav" aria-label={role === "admin" ? "Administrator" : "Worker"}>
        {sections.map((section) => (
          <div key={section.label}>
            <p className="sidebar-section-label">{section.label}</p>
            {section.items.map((item) => {
              const active =
                item.href === home ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "sidebar-link sidebar-link-active" : "sidebar-link"}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer" ref={accountRef}>
        <button
          type="button"
          className="sidebar-account-button"
          aria-label="Account menu"
          aria-expanded={accountOpen}
          onClick={() => setAccountOpen((open) => !open)}
        >
          <UserAvatar name={name} imageUrl={imageUrl || (user?.hasImage ? user.imageUrl : null)} />
          <span className="sidebar-footer-copy">
            <strong>{name}</strong>
            <span>{role === "admin" ? "Administrator" : "Worker"}</span>
          </span>
        </button>
        {accountOpen ? (
          <div className="sidebar-menu" role="menu">
            <Link href={profileHref} onClick={() => { setAccountOpen(false); onNavigate(); }}>
              <User size={16} />
              Profile
            </Link>
            <SignOutButton redirectUrl="/">
              <button type="button" onClick={() => sessionStorage.setItem("chae-signing-out", "1")}>
                <LogOut size={16} />
                Sign out
              </button>
            </SignOutButton>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
