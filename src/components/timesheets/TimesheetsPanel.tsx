"use client";

import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

const dayLabels = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
] as const;

type TimesheetStatus = "pending" | "approved" | "rejected";

type TimesheetRow = {
  timesheetId: Id<"timesheets">;
  workerName: string;
  workerEmail: string;
  jobSiteName: string;
  weekStart: string;
  weekEnd: string;
  comments: string | null;
  hours: Record<(typeof dayLabels)[number][0], number>;
  totalHours: number;
  status: TimesheetStatus;
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

// Formats an hour count, keeping a decimal only when the value is not whole.
function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

// Lets an admin review submitted timesheets and approve or reject the ones still pending.
export function TimesheetsPanel() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "this company";
  const timesheets = useQuery(api.timesheets.queries.listTimesheets);
  const decideTimesheet = useMutation(api.timesheets.mutations.decideTimesheet);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<Id<"timesheets"> | null>(null);
  const confirm = useConfirm();

  // Approves or rejects one pending timesheet after the admin confirms.
  async function onDecide(row: TimesheetRow, status: "approved" | "rejected") {
    const approving = status === "approved";
    const { accepted, note } = await confirm({
      title: approving ? "Approve timesheet" : "Reject timesheet",
      body: `${approving ? "Approve" : "Reject"} the timesheet for ${row.workerName}?`,
      confirmLabel: approving ? "Approve" : "Reject",
      tone: approving ? "primary" : "danger",
      noteLabel: approving ? undefined : "Reason",
    });
    if (!accepted) return;
    setBusyId(row.timesheetId);
    setError("");
    try {
      await decideTimesheet({
        timesheetId: row.timesheetId,
        status,
        ...(status === "rejected" ? { rejectionReason: note } : {}),
      });
    } catch (caught) {
      setError(errorText(caught, `Could not ${status === "approved" ? "approve" : "reject"} that timesheet.`));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <section className="saas-card invite-panel">
        <h2 className="panel-title">Waiting for review</h2>
        <p className="panel-copy">
          Weekly hours workers at {company} have submitted. Approving or rejecting a timesheet records that
          decision.
        </p>
        {error ? <p className="field-error">{error}</p> : null}
        {timesheets === undefined ? (
          <p className="invite-note">Loading timesheets…</p>
        ) : timesheets.pending.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">Nothing to review</h3>
            <p className="panel-copy">Timesheets waiting for approval will show up here.</p>
          </div>
        ) : (
          <TimesheetTable
            rows={timesheets.pending}
            busyId={busyId}
            onDecide={onDecide}
          />
        )}
      </section>

      {timesheets && timesheets.reviewed.length > 0 ? (
        <section className="saas-card stack-card">
          <h2 className="panel-title">Reviewed</h2>
          <p className="panel-copy">Timesheets already approved or rejected for {company}.</p>
          <TimesheetTable rows={timesheets.reviewed} busyId={null} />
        </section>
      ) : null}
    </>
  );
}

// Renders one timesheet table, with approve and reject actions when a handler is provided.
function TimesheetTable({
  rows,
  busyId,
  onDecide,
}: {
  rows: TimesheetRow[];
  busyId: Id<"timesheets"> | null;
  onDecide?: (row: TimesheetRow, status: "approved" | "rejected") => void;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Worker</th>
            <th scope="col">Job site</th>
            <th scope="col">Week</th>
            <th scope="col">Hours</th>
            <th scope="col">Comments</th>
            <th scope="col">Status</th>
            {onDecide ? (
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const busy = busyId === row.timesheetId;
            return (
              <tr key={row.timesheetId}>
                <td>
                  <strong>{row.workerName}</strong>
                  <span className="hours-breakdown">{row.workerEmail || "No email on file"}</span>
                </td>
                <td>{row.jobSiteName}</td>
                <td>
                  {formatDay(row.weekStart)} – {formatDay(row.weekEnd)}
                </td>
                <td>
                  <strong>{formatHours(row.totalHours)}h</strong>
                  <span className="hours-breakdown">
                    {dayLabels.map(([key, label]) => `${label} ${formatHours(row.hours[key])}`).join(" · ")}
                  </span>
                </td>
                <td>{row.comments || "No comments"}</td>
                <td>
                  <StatusBadge status={row.status} />
                  {row.rejectionReason ? <span className="hours-breakdown">{row.rejectionReason}</span> : null}
                </td>
                {onDecide ? (
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="row-action"
                        disabled={busy}
                        onClick={() => onDecide(row, "approved")}
                      >
                        {busy ? "Saving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="row-action row-action-danger"
                        disabled={busy}
                        onClick={() => onDecide(row, "rejected")}
                      >
                        {busy ? "Saving…" : "Reject"}
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Shows pending, approved, or rejected as a colored label.
function StatusBadge({ status }: { status: TimesheetStatus }) {
  if (status === "approved") return <Badge tone="success">Approved</Badge>;
  if (status === "rejected") return <Badge tone="danger">Rejected</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

// Shows the timesheet review page for the signed-in admin's company.
export function AdminTimesheetsPage() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "your company";

  return (
    <>
      <header className="page-header">
        <h2 className="page-title">Timesheets</h2>
        <p className="page-description">Review weekly hours submitted by workers at {company}.</p>
      </header>
      <TimesheetsPanel />
    </>
  );
}
