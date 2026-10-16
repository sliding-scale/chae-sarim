"use client";

import { AppDataTable, DataTableColumnHeader, TableMuted, TablePerson, TableStatus } from "@/components/lists/AppDataTable";
import type { DataTableFeatures } from "@/components/lists/data-table-features";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createColumnHelper } from "@tanstack/react-table";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useMemo, useState } from "react";

type HolidayStatus = "draft" | "pending" | "approved" | "rejected";

type HolidayRow = {
  holidayRequestId: Id<"holidayRequests">;
  jobSiteName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: HolidayStatus;
  rejectionReason: string | null;
};

// Reads a user-facing message from a Convex error.
function errorText(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return fallback;
}

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

// Lets a worker request time off for one job site in their company.
export function WorkerHolidaysPanel() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "your company";
  const sites = useQuery(api.jobSites.queries.listWorkerJobSites);
  const holidays = useQuery(api.holidays.queries.listMyHolidays);
  const submitHoliday = useMutation(api.holidays.mutations.submitHoliday);
  const [jobSiteChoice, setJobSiteChoice] = useState<Id<"jobSites"> | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const jobSiteId = jobSiteChoice ?? sites?.[0]?.jobSiteId ?? "";

  // Submits the holiday request for admin review.
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jobSiteId) return;
    const { accepted } = await confirm({
      title: "Submit holiday request",
      body: "Submit this holiday request for review?",
      confirmLabel: "Submit request",
      tone: "primary",
    });
    if (!accepted) return;
    setBusy(true);
    setError("");
    try {
      await submitHoliday({ jobSiteId, startDate, endDate, reason });
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (caught) {
      setError(errorText(caught, "Could not submit that holiday request."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="saas-card invite-panel">
        <h2 className="panel-title">Request time off</h2>
        <p className="panel-copy">
          Request time off for {company}. An admin reviews the request after you submit.
        </p>
        {sites === undefined ? (
          <p className="invite-note">Loading job sites…</p>
        ) : sites.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">No job sites assigned</h3>
            <p className="panel-copy">Ask an administrator to assign a job site before you request time off.</p>
          </div>
        ) : (
          <form className="timesheet-form" onSubmit={onSubmit} noValidate>
            <div className="timesheet-fields">
              <div>
                <label className="form-label" htmlFor="holiday-site">
                  Job site
                  <RequiredMark />
                </label>
                <select
                  id="holiday-site"
                  className="input-saas"
                  value={jobSiteId}
                  disabled={busy}
                  onChange={(event) => setJobSiteChoice(event.target.value as Id<"jobSites">)}
                >
                  {sites.map((site) => (
                    <option key={site.jobSiteId} value={site.jobSiteId}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="holiday-start">
                  Start date
                  <RequiredMark />
                </label>
                <input
                  id="holiday-start"
                  className="input-saas"
                  type="date"
                  value={startDate}
                  disabled={busy}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="holiday-end">
                  End date
                  <RequiredMark />
                </label>
                <input
                  id="holiday-end"
                  className="input-saas"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  disabled={busy}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="holiday-reason">
                Reason
                <RequiredMark />
              </label>
              <textarea
                id="holiday-reason"
                className="input-saas timesheet-comments"
                value={reason}
                maxLength={500}
                disabled={busy}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <div className="timesheet-submit">
              <button
                className="btn-primary"
                type="submit"
                disabled={busy || !jobSiteId || !startDate || !endDate || !reason.trim()}
              >
                {busy ? "Saving…" : "Submit request"}
              </button>
            </div>
            {error ? <p className="field-error">{error}</p> : null}
          </form>
        )}
      </section>

      <section className="saas-card stack-card">
        <h2 className="panel-title">Your requests</h2>
        <p className="panel-copy">Holiday requests you have submitted for {company}.</p>
        {holidays === undefined ? (
          <p className="invite-note">Loading holiday requests…</p>
        ) : (
          <HolidayTable rows={holidays} />
        )}
      </section>
    </>
  );
}

const workerHolidayColumns = createColumnHelper<DataTableFeatures, HolidayRow>();

// Renders the worker's holiday requests.
function HolidayTable({ rows }: { rows: HolidayRow[] }) {
  const columns = useMemo(
    () =>
      workerHolidayColumns.columns([
        workerHolidayColumns.accessor("jobSiteName", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job site" />,
          cell: ({ row }) => <TablePerson name={row.original.jobSiteName} />,
          sortFn: "text",
        }),
        workerHolidayColumns.accessor("startDate", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Dates" />,
          cell: ({ row }) => <TableMuted>{`${formatDay(row.original.startDate)} – ${formatDay(row.original.endDate)}`}</TableMuted>,
          sortFn: "alphanumeric",
        }),
        workerHolidayColumns.accessor("reason", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Reason" />,
          cell: ({ row }) => <TableMuted>{row.original.reason}</TableMuted>,
          sortFn: "text",
        }),
        workerHolidayColumns.accessor((row) => [row.status, row.rejectionReason].filter(Boolean).join(" "), {
          id: "status",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => (
            <TableStatus
              label={statusLabel(row.original.status)}
              detail={row.original.rejectionReason}
              tone={row.original.status === "rejected" ? "danger" : "default"}
            />
          ),
          sortFn: "text",
        }),
      ]),
    [],
  );

  return (
    <AppDataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Filter requests..."
      filters={[{ id: "status", label: "Status", value: (row) => statusLabel(row.status) }]}
    />
  );
}

// Returns the plain status label for a holiday request.
function statusLabel(status: HolidayStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "draft") return "Draft";
  return "Pending";
}

// Shows the holiday request page for the signed-in worker.
export function WorkerHolidaysPage() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "your company";

  return (
    <>
      <header className="page-header">
        <p className="page-description">Request time off from a job site at {company}.</p>
      </header>
      <WorkerHolidaysPanel />
    </>
  );
}
