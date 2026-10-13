"use client";

import { Logo } from "@/components/brand/Logo";
import { UserAvatar } from "@/components/users/UserAvatar";
import { homeFor, navigationFor, type AppRole } from "@/lib/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Renders the dashboard sidebar for the signed-in role.
export function AppSidebar({
  role,
  name,
  tenantName,
  open,
  onNavigate,
}: {
  role: AppRole;
  name: string;
  tenantName: string | null;
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const home = homeFor(role);
  const sections = navigationFor(role);

  return (
    <aside className={open ? "app-sidebar is-open" : "app-sidebar"}>
      <div className="sidebar-logo">
        <Logo href={home} />
      </div>
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
      <div className="sidebar-footer">
        <UserAvatar name={name} />
        <div className="sidebar-footer-copy">
          <strong>{name}</strong>
          <span>
            {role === "admin" ? "Administrator" : "Worker"}
            {tenantName ? ` · ${tenantName}` : ""}
          </span>
        </div>
      </div>
    </aside>
  );
}
