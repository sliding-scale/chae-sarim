"use client";

import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StatCard } from "@/components/dashboard/StatCard";
import { useWorkspace } from "@/components/layout/RoleGate";
import { useGreeting } from "@/lib/use-greeting";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { CalendarOff, ClipboardList, FileText } from "lucide-react";
import Link from "next/link";

// Describes how many of this worker's records are waiting for review.
function waitingNote(count: number) {
  if (count === 0) return "None waiting for review";
  if (count === 1) return "1 waiting for review";
  return `${count} waiting for review`;
}

// Shows this worker's totals and recent activity.
export function WorkerOverview() {
  const stats = useQuery(api.dashboard.queries.getWorkerStats);

  return (
    <>
      <div className="overview-stats">
        <Link className="stat-link" href="/dashboard/worker/timesheets">
          <StatCard
            icon={ClipboardList}
            label="Timesheets"
            value={stats ? String(stats.timesheets) : "—"}
            trend={stats ? waitingNote(stats.pendingTimesheets) : undefined}
          />
        </Link>
        <Link className="stat-link" href="/dashboard/worker/invoices">
          <StatCard
            icon={FileText}
            label="Invoices"
            value={stats ? String(stats.invoices) : "—"}
            trend={stats ? waitingNote(stats.pendingInvoices) : undefined}
          />
        </Link>
        <Link className="stat-link" href="/dashboard/worker/holidays">
          <StatCard
            icon={CalendarOff}
            label="Holidays"
            value={stats ? String(stats.holidays) : "—"}
            trend={stats ? waitingNote(stats.pendingHolidays) : undefined}
          />
        </Link>
      </div>
      <RecentActivity />
    </>
  );
}

// Shows the worker overview, with personal totals and recent activity.
export function WorkerDashboardPage() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "Your company";
  const greeting = useGreeting(workspace.name);

  return (
    <>
      <header className="page-header">
        <h2 className="page-title greeting-title" suppressHydrationWarning>
          {greeting}
        </h2>
        <p className="page-description">
          {company}. These are your timesheets, invoices, and holiday requests.
        </p>
      </header>
      <WorkerOverview />
    </>
  );
}
