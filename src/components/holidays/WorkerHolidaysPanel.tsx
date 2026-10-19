"use client";

import {
  AppDataTable,
  DataTableColumnHeader,
  TableLongText,
  TableMuted,
  TableName,
  TableStatus,
  formatDateRange,
} from "@/components/lists/AppDataTable";
import type { DataTableFeatures } from "@/components/lists/data-table-features";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { ContentHeading } from "@/components/dashboard/ContentHeading";
import { NoSitesNotice } from "@/components/dashboard/NoSitesNotice";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createColumnHelper } from "@tanstack/react-table";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { CalendarClock } from "lucide-react";
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

// Lets a worker request time off for one job site in their company.
export function WorkerHolidaysPanel({ query = "" }: { query?: string }) {
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
      <ContentHeading title="Holidays" description="Request a holiday and follow each decision." />
      <section className="worker-card time-off-card">
        <div className="time-off-head">
          <span className="time-off-icon">
            <CalendarClock aria-hidden="true" />
          </span>
          <div className="time-off-copy">
            <h2 className="panel-title">Request a holiday</h2>
            <p className="panel-copy">
              Request a holiday for {company}. An administrator reviews it after you submit.
            </p>
          </div>
        </div>
        {sites === undefined ? (
          <p className="invite-note">Loading job sites…</p>
        ) : sites.length === 0 ? (
          <NoSitesNotice message="Ask an administrator to assign a job site before you request a holiday." />
        ) : (
          <form className="time-off-form" onSubmit={onSubmit} noValidate>
            <div className="time-off-grid">
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
                {busy ? "Saving…" : "Submit holiday"}
              </button>
            </div>
            {error ? <p className="field-error">{error}</p> : null}
          </form>
        )}
      </section>

      <section className="worker-card">
        <h2 className="panel-title">Your holidays</h2>
        <p className="panel-copy">Holidays you have submitted for {company}.</p>
        {holidays === undefined ? (
          <p className="invite-note">Loading holidays…</p>
        ) : (
          <HolidayTable rows={holidays} query={query} />
        )}
      </section>
    </>
  );
}

const workerHolidayColumns = createColumnHelper<DataTableFeatures, HolidayRow>();

// Renders the worker's holiday requests.
function HolidayTable({ rows, query }: { rows: HolidayRow[]; query: string }) {
  const columns = useMemo(
    () =>
      workerHolidayColumns.columns([
        workerHolidayColumns.accessor("jobSiteName", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job Site" />,
          cell: ({ row }) => <TableName>{row.original.jobSiteName}</TableName>,
          sortFn: "text",
        }),
        workerHolidayColumns.accessor("startDate", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Dates" />,
          cell: ({ row }) => <TableMuted>{formatDateRange(row.original.startDate, row.original.endDate)}</TableMuted>,
          sortFn: "alphanumeric",
        }),
        workerHolidayColumns.accessor("reason", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Reason" />,
          cell: ({ row }) => <TableLongText text={row.original.reason} title="Reason" />,
          sortFn: "text",
        }),
        workerHolidayColumns.accessor("status", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => (
            <TableStatus
              label={statusLabel(row.original.status)}
              tone={
                row.original.status === "approved"
                  ? "success"
                  : row.original.status === "rejected"
                    ? "danger"
                    : row.original.status === "draft"
                      ? "draft"
                      : "warning"
              }
            />
          ),
          sortFn: "text",
        }),
        workerHolidayColumns.accessor((row) => row.rejectionReason ?? "", {
          id: "rejectionReason",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Rejection reason" />,
          cell: ({ row }) => <TableLongText text={row.original.rejectionReason} title="Rejection reason" tone="danger" />,
          sortFn: "text",
        }),
      ]),
    [],
  );

  return (
    <AppDataTable
      key={query}
      columns={columns}
      data={rows}
      searchPlaceholder="Search by job site or reason…"
      initialSearch={query}
      rowSearch={holidaySearch}
      filters={[{ id: "status", label: "Status", value: (row) => statusLabel(row.status) }]}
      empty={{
        title: "No holidays yet",
        description: "Your holidays will appear here once you submit one.",
      }}
    />
  );
}

// Joins the fields a worker can type to find one holiday request.
function holidaySearch(row: HolidayRow) {
  return [
    row.jobSiteName,
    formatDateRange(row.startDate, row.endDate),
    row.startDate,
    row.reason,
    statusLabel(row.status),
    row.rejectionReason ?? "",
  ].join(" ");
}

// Returns the plain status label for a holiday request.
function statusLabel(status: HolidayStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "draft") return "Draft";
  return "Pending";
}

// Shows the holiday request page for the signed-in worker.
export function WorkerHolidaysPage({ query = "" }: { query?: string }) {
  return <WorkerHolidaysPanel query={query} />;
}
