"use client";

import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

type HolidayStatus = "pending" | "approved" | "rejected";

type HolidayRow = {
  holidayRequestId: Id<"holidayRequests">;
  workerName: string;
  workerEmail: string;
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

// Lets an admin review submitted holiday requests and approve or reject the ones still pending.
export function HolidaysPanel() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "this company";
  const holidays = useQuery(api.holidays.queries.listHolidays);
  const decideHoliday = useMutation(api.holidays.mutations.decideHoliday);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<Id<"holidayRequests"> | null>(null);
  const confirm = useConfirm();

  // Approves or rejects one pending holiday request after the admin confirms.
  async function onDecide(row: HolidayRow, status: "approved" | "rejected") {
    const approving = status === "approved";
    const { accepted, note } = await confirm({
      title: approving ? "Approve holiday request" : "Reject holiday request",
      body: `${approving ? "Approve" : "Reject"} the holiday request for ${row.workerName}?`,
      confirmLabel: approving ? "Approve" : "Reject",
      tone: approving ? "primary" : "danger",
      noteLabel: approving ? undefined : "Reason",
    });
    if (!accepted) return;
    setBusyId(row.holidayRequestId);
    setError("");
    try {
      await decideHoliday({
        holidayRequestId: row.holidayRequestId,
        status,
        ...(status === "rejected" ? { rejectionReason: note } : {}),
      });
    } catch (caught) {
      setError(errorText(caught, `Could not ${status === "approved" ? "approve" : "reject"} that holiday request.`));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <section className="saas-card invite-panel">
        <h2 className="panel-title">Waiting for review</h2>
        <p className="panel-copy">
          Time off workers at {company} have requested. Approving or rejecting a request records that decision.
        </p>
        {error ? <p className="field-error">{error}</p> : null}
        {holidays === undefined ? (
          <p className="invite-note">Loading holiday requests…</p>
        ) : holidays.pending.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">Nothing to review</h3>
            <p className="panel-copy">Holiday requests waiting for approval will show up here.</p>
          </div>
        ) : (
          <HolidayTable rows={holidays.pending} busyId={busyId} onDecide={onDecide} />
        )}
      </section>

      {holidays && holidays.reviewed.length > 0 ? (
        <section className="saas-card stack-card">
          <h2 className="panel-title">Reviewed</h2>
          <p className="panel-copy">Holiday requests already approved or rejected for {company}.</p>
          <HolidayTable rows={holidays.reviewed} busyId={null} />
        </section>
      ) : null}
    </>
  );
}

// Renders one holiday table, with approve and reject actions when a handler is provided.
function HolidayTable({
  rows,
  busyId,
  onDecide,
}: {
  rows: HolidayRow[];
  busyId: Id<"holidayRequests"> | null;
  onDecide?: (row: HolidayRow, status: "approved" | "rejected") => void;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Worker</th>
            <th scope="col">Job site</th>
            <th scope="col">Dates</th>
            <th scope="col">Reason</th>
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
            const busy = busyId === row.holidayRequestId;
            return (
              <tr key={row.holidayRequestId}>
                <td>
                  <strong>{row.workerName}</strong>
                  <span className="hours-breakdown">{row.workerEmail || "No email on file"}</span>
                </td>
                <td>{row.jobSiteName}</td>
                <td>
                  {formatDay(row.startDate)} – {formatDay(row.endDate)}
                </td>
                <td>{row.reason}</td>
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
function StatusBadge({ status }: { status: HolidayStatus }) {
  if (status === "approved") return <Badge tone="success">Approved</Badge>;
  if (status === "rejected") return <Badge tone="danger">Rejected</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

// Shows the holiday review page for the signed-in admin's company.
export function AdminHolidaysPage() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "your company";

  return (
    <>
      <header className="page-header">
        <h2 className="page-title">Holiday requests</h2>
        <p className="page-description">Review time off requested by workers at {company}.</p>
      </header>
      <HolidaysPanel />
    </>
  );
}
