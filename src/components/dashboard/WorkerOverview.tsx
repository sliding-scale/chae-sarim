"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useGreeting } from "@/lib/use-greeting";

const sectionHref = {
  timesheet: "/dashboard/worker/timesheets",
  invoice: "/dashboard/worker/invoices",
  holiday: "/dashboard/worker/holidays",
} as const;

const sectionLabel = {
  timesheet: "Timesheet",
  invoice: "Invoice",
  holiday: "Holiday",
} as const;

type SubmissionStatus = "draft" | "pending" | "approved" | "rejected";

// Formats a YYYY-MM-DD date without shifting it across time zones.
function formatDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Formats a YYYY-MM month without shifting it across time zones.
function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

// Turns a stored submission detail into the date range or month a worker reads.
function formatDetail(kind: keyof typeof sectionLabel, detail: string) {
  if (kind === "invoice") return formatMonth(detail);
  const [start, end] = detail.split("|");
  if (!start || !end) return detail;
  return `${formatDay(start)} – ${formatDay(end)}`;
}

// Shows pending, approved, rejected, or draft as a colored label.
function StatusBadge({ status }: { status: SubmissionStatus }) {
  if (status === "approved") return <Badge tone="success">Approved</Badge>;
  if (status === "rejected") return <Badge tone="danger">Rejected</Badge>;
  if (status === "draft") return <Badge tone="neutral">Draft</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

// Shows the signed-in worker's own timesheets, invoices, and holiday requests.
export function WorkerOverview() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "this company";
  const overview = useQuery(api.dashboard.queries.getWorkerOverview);

  if (overview === undefined) {
    return <p className="invite-note">Loading your submissions…</p>;
  }

  return (
    <>
      <div className="overview-stats">
        <Link href="/dashboard/worker/timesheets" className="stat-link">
          <StatCard label="Timesheets" value={String(overview.timesheetCount)} />
        </Link>
        <Link href="/dashboard/worker/invoices" className="stat-link">
          <StatCard label="Invoices" value={String(overview.invoiceCount)} />
        </Link>
        <Link href="/dashboard/worker/holidays" className="stat-link">
          <StatCard label="Holidays" value={String(overview.holidayCount)} />
        </Link>
      </div>

      <section className="saas-card invite-panel">
        <div className="section-heading">
          <div>
            <h2 className="panel-title">Your submissions</h2>
            <p className="panel-copy">Timesheets, invoices, and holiday requests you submitted for {company}.</p>
          </div>
        </div>
        {overview.submissions.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">Nothing submitted yet</h3>
            <p className="panel-copy">A timesheet, invoice, or holiday request you submit will show up here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Job site</th>
                  <th scope="col">Details</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {overview.submissions.map((item) => (
                  <tr key={item.id}>
                    <td>{sectionLabel[item.kind]}</td>
                    <td>{item.jobSiteName}</td>
                    <td>{formatDetail(item.kind, item.detail)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <Link href={sectionHref[item.kind]} className="row-action">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// Shows the signed-in worker's own timesheets, invoices, and holiday requests.
export function WorkerDashboardPage() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "Your company";
  const greeting = useGreeting(workspace.name);

  return (
    <>
      <header className="page-header">
        <h2 className="page-title" suppressHydrationWarning>
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
