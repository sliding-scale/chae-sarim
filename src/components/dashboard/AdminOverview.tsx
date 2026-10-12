"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useGreeting } from "@/lib/use-greeting";

const reviewHref = {
  timesheet: "/dashboard/admin/timesheets",
  invoice: "/dashboard/admin/invoices",
  holiday: "/dashboard/admin/holidays",
} as const;

const reviewLabel = {
  timesheet: "Timesheet",
  invoice: "Invoice",
  holiday: "Holiday",
} as const;

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

// Turns a stored pending-item detail into the date range or month an admin reads.
function formatDetail(kind: keyof typeof reviewLabel, detail: string) {
  if (kind === "invoice") return formatMonth(detail);
  const [start, end] = detail.split("|");
  if (!start || !end) return detail;
  return `${formatDay(start)} – ${formatDay(end)}`;
}

// Shows this company's workers, job sites, and items waiting for approval.
export function AdminOverview() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "this company";
  const overview = useQuery(api.dashboard.queries.getAdminOverview);

  if (overview === undefined) {
    return <p className="invite-note">Loading {company}…</p>;
  }

  return (
    <>
      <div className="overview-stats">
        <Link href="/dashboard/admin/workers" className="stat-link">
          <StatCard label="Workers" value={String(overview.workers.length)} />
        </Link>
        <Link href="/dashboard/admin/job-sites" className="stat-link">
          <StatCard label="Job sites" value={String(overview.jobSites.length)} />
        </Link>
        <StatCard label="Pending approvals" value={String(overview.pending.length)} />
      </div>

      <section className="saas-card invite-panel">
        <div className="section-heading">
          <div>
            <h2 className="panel-title">Workers</h2>
            <p className="panel-copy">People who have joined {company}.</p>
          </div>
          <Link href="/dashboard/admin/workers" className="row-action">
            Manage
          </Link>
        </div>
        {overview.workers.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">No workers yet</h3>
            <p className="panel-copy">Workers appear here after they sign up with an invited email.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                </tr>
              </thead>
              <tbody>
                {overview.workers.map((worker) => (
                  <tr key={worker.membershipId}>
                    <td>
                      <strong>{worker.name}</strong>
                    </td>
                    <td>{worker.email || "No email on file"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="saas-card stack-card">
        <div className="section-heading">
          <div>
            <h2 className="panel-title">Job sites</h2>
            <p className="panel-copy">Places where workers at {company} record time.</p>
          </div>
          <Link href="/dashboard/admin/job-sites" className="row-action">
            Manage
          </Link>
        </div>
        {overview.jobSites.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">No job sites yet</h3>
            <p className="panel-copy">Sites you add for this company will show up here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Address</th>
                </tr>
              </thead>
              <tbody>
                {overview.jobSites.map((site) => (
                  <tr key={site.name}>
                    <td>
                      <strong>{site.name}</strong>
                    </td>
                    <td>{site.address || "No address"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="saas-card stack-card">
        <div className="section-heading">
          <div>
            <h2 className="panel-title">Pending approvals</h2>
            <p className="panel-copy">Timesheets, invoices, and holiday requests waiting for review at {company}.</p>
          </div>
        </div>
        {overview.pending.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">Nothing to review</h3>
            <p className="panel-copy">Submitted timesheets, invoices, and holiday requests will show up here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Worker</th>
                  <th scope="col">Job site</th>
                  <th scope="col">Details</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {overview.pending.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Badge tone="warning">{reviewLabel[item.kind]}</Badge>
                    </td>
                    <td>
                      <strong>{item.workerName}</strong>
                    </td>
                    <td>{item.jobSiteName}</td>
                    <td>{formatDetail(item.kind, item.detail)}</td>
                    <td>
                      <Link href={reviewHref[item.kind]} className="row-action">
                        Review
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

// Shows workers, job sites, and pending approvals for the signed-in admin's company.
export function AdminDashboardPage() {
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
          {company}. You are the administrator for this company ({workspace.email}).
        </p>
      </header>
      <AdminOverview />
    </>
  );
}
