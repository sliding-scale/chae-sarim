"use client";

import { useConfirm } from "@/components/ui/ConfirmDialog";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";

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
            <h3 className="panel-title">No job sites yet</h3>
            <p className="panel-copy">Ask an admin to add a job site before you request time off.</p>
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
        ) : holidays.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">No holiday requests yet</h3>
            <p className="panel-copy">A request you submit will show up here.</p>
          </div>
        ) : (
          <HolidayTable rows={holidays} />
        )}
      </section>
    </>
  );
}

// Renders the worker's holiday requests.
function HolidayTable({ rows }: { rows: HolidayRow[] }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Job site</th>
            <th scope="col">Dates</th>
            <th scope="col">Reason</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.holidayRequestId}>
              <td>{row.jobSiteName}</td>
              <td>
                {formatDay(row.startDate)} – {formatDay(row.endDate)}
              </td>
              <td>{row.reason}</td>
              <td>
                <StatusBadge status={row.status} />
                {row.rejectionReason ? <span className="hours-breakdown">{row.rejectionReason}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Shows draft, pending, approved, or rejected as a colored label.
function StatusBadge({ status }: { status: HolidayStatus }) {
  if (status === "approved") return <Badge tone="success">Approved</Badge>;
  if (status === "rejected") return <Badge tone="danger">Rejected</Badge>;
  if (status === "draft") return <Badge tone="neutral">Draft</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

// Shows the holiday request page for the signed-in worker.
export function WorkerHolidaysPage() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "your company";

  return (
    <>
      <header className="page-header">
        <h2 className="page-title">Holiday requests</h2>
        <p className="page-description">Request time off from a job site at {company}.</p>
      </header>
      <WorkerHolidaysPanel />
    </>
  );
}
