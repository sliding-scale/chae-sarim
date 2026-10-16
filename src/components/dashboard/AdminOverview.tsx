"use client";

import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StatCard } from "@/components/dashboard/StatCard";
import { useWorkspace } from "@/components/layout/RoleGate";
import { useGreeting } from "@/lib/use-greeting";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { ClipboardList, MapPin, Users } from "lucide-react";
import Link from "next/link";

// Describes how many timesheets, invoices, and holidays are waiting.
function pendingNote(timesheets: number, invoices: number, holidays: number) {
  const total = timesheets + invoices + holidays;
  if (total === 0) return "Nothing waiting for review";
  return `${timesheets} timesheets, ${invoices} invoices, ${holidays} holidays`;
}

// Shows company totals and recent activity for the signed-in admin.
export function AdminOverview() {
  const stats = useQuery(api.dashboard.queries.getAdminStats);
  const pending = stats
    ? stats.pendingTimesheets + stats.pendingInvoices + stats.pendingHolidays
    : null;

  return (
    <>
      <div className="overview-stats">
        <Link className="stat-link" href="/dashboard/admin/workers">
          <StatCard tone="green" icon={Users} label="Workers" value={stats ? String(stats.workers) : "—"} />
        </Link>
        <Link className="stat-link" href="/dashboard/admin/job-sites">
          <StatCard tone="blue" icon={MapPin} label="Job sites" value={stats ? String(stats.jobSites) : "—"} />
        </Link>
        <StatCard
          tone="amber"
          icon={ClipboardList}
          label="Pending"
          value={pending === null ? "—" : String(pending)}
          trend={
            stats
              ? pendingNote(stats.pendingTimesheets, stats.pendingInvoices, stats.pendingHolidays)
              : undefined
          }
        />
      </div>
      <RecentActivity />
    </>
  );
}

// Shows the admin overview, with company totals and recent activity.
export function AdminDashboardPage() {
  const workspace = useWorkspace();
  const greeting = useGreeting(workspace.name);

  return (
    <>
      <header className="page-header">
        <h2 className="page-title greeting-title" suppressHydrationWarning>
          {greeting}
        </h2>
      </header>
      <AdminOverview />
    </>
  );
}
