"use client";

import { AppDataTable, DataTableColumnHeader, TableMuted } from "@/components/lists/AppDataTable";
import type { DataTableFeatures } from "@/components/lists/data-table-features";
import { useWorkspace } from "@/components/layout/RoleGate";
import { homeWindow } from "@/lib/home-window";
import { useGreeting } from "@/lib/use-greeting";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { CalendarDays, FileText, Plane, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SiteRow = {
  jobSiteId: Id<"jobSites">;
  name: string;
  address: string | null;
};

const siteColumns = createColumnHelper<DataTableFeatures, SiteRow>();

// Shows the signed-in worker's shortcuts, job sites, and this month.
export function WorkerDashboardPage() {
  const workspace = useWorkspace();
  const greeting = useGreeting(workspace.name);
  const [month, setMonth] = useState<string | null>(null);
  useEffect(() => {
    setMonth(homeWindow().month);
  }, []);
  const home = useQuery(api.dashboard.queries.getWorkerHome, month ? { month } : "skip");
  const holidayDays = home?.holidayDays ?? 0;

  return (
    <div className="home-worker">
      <header className="home-hero">
        <div className="home-greeting">
          <h1 suppressHydrationWarning>
            {greeting}! <span className="home-wave">👋</span>
          </h1>
          <p>Here&apos;s your overview for this month.</p>
        </div>
      </header>

      <section className="home-stats" aria-label="Quick actions">
        <Link className="home-stat is-green" href="/dashboard/worker/timesheets">
          <span className="home-bubble">
            <CalendarDays aria-hidden="true" />
          </span>
          <p>Upload Timesheet</p>
          <small>Submit your hours for approval</small>
        </Link>
        <Link className="home-stat" href="/dashboard/worker/invoices">
          <span className="home-bubble">
            <FileText aria-hidden="true" />
          </span>
          <p>Upload Invoice</p>
          <small>Add your invoice for review</small>
        </Link>
        <Link className="home-stat is-amber" href="/dashboard/worker/holidays">
          <span className="home-bubble">
            <Plane aria-hidden="true" />
          </span>
          <p>Request Holiday</p>
          <small>Plan your time off</small>
        </Link>
      </section>

      <section className="home-lower">
        <article className="home-panel">
          <h2>Your Job Sites</h2>
          {home === undefined ? (
            <p className="home-note">Loading job sites…</p>
          ) : (
            <div className="home-sites-table">
              <SiteTable rows={home.sites} />
            </div>
          )}
        </article>
        <article className="home-panel">
          <h2>This Month Summary</h2>
          <SummaryRow
            tone="hours"
            icon={Users}
            label="Hours Logged"
            value={home ? String(Number(home.hoursLogged.toFixed(2))) : "—"}
          />
          <SummaryRow
            tone="invoice"
            icon={FileText}
            label="Invoices Submitted"
            value={home ? String(home.invoicesSubmitted) : "—"}
          />
          <SummaryRow
            tone="holiday"
            icon={Plane}
            label="Holiday Days"
            value={home ? (holidayDays === 1 ? "1 day" : `${holidayDays} days`) : "—"}
          />
        </article>
      </section>
    </div>
  );
}

// Lists the worker's assigned job sites with paging.
function SiteTable({ rows }: { rows: SiteRow[] }) {
  const columns = useMemo(
    () =>
      siteColumns.columns([
        siteColumns.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }) => <span className="table-person-name">{row.original.name}</span>,
          sortFn: "text",
        }),
        siteColumns.accessor((row) => row.address ?? "", {
          id: "address",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Address" />,
          cell: ({ row }) => <TableMuted>{row.original.address ?? "No address"}</TableMuted>,
          sortFn: "text",
        }),
      ]),
    [],
  );

  return (
    <AppDataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search job sites..."
      empty={{
        title: "No job sites yet",
        description: "Assigned job sites will appear here.",
      }}
    />
  );
}

// Shows one number in the worker's monthly summary.
function SummaryRow({
  tone,
  icon: Icon,
  label,
  value,
}: {
  tone: "hours" | "invoice" | "holiday";
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className={`home-summary is-${tone}`}>
      <span>
        <Icon aria-hidden="true" />
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
