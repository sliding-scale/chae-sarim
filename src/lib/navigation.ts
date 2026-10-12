import {
  CalendarOff,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AppRole = "admin" | "worker";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const adminNavigation: { label: string; items: NavItem[] }[] = [
  {
    label: "Company",
    items: [
      { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/admin/workers", label: "Workers", icon: Users },
      { href: "/dashboard/admin/job-sites", label: "Job sites", icon: MapPin },
    ],
  },
  {
    label: "Review",
    items: [
      { href: "/dashboard/admin/timesheets", label: "Timesheets", icon: ClipboardList },
      { href: "/dashboard/admin/invoices", label: "Invoices", icon: FileText },
      { href: "/dashboard/admin/holidays", label: "Holidays", icon: CalendarOff },
    ],
  },
];

export const workerNavigation: { label: string; items: NavItem[] }[] = [
  {
    label: "My work",
    items: [
      { href: "/dashboard/worker", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/worker/timesheets", label: "Timesheets", icon: ClipboardList },
      { href: "/dashboard/worker/invoices", label: "Invoices", icon: FileText },
      { href: "/dashboard/worker/holidays", label: "Holidays", icon: CalendarOff },
    ],
  },
];

// Returns the sidebar links for an admin or a worker.
export function navigationFor(role: AppRole) {
  return role === "admin" ? adminNavigation : workerNavigation;
}

// Returns the dashboard path for an admin or a worker.
export function homeFor(role: AppRole) {
  return role === "admin" ? "/dashboard/admin" : "/dashboard/worker";
}
