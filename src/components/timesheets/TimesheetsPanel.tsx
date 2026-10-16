"use client";

import { AppDataTable, DataTableColumnHeader, TableFigure, TableMuted, TablePerson, TableStatus, emailHandle } from "@/components/lists/AppDataTable";
import type { DataTableFeatures } from "@/components/lists/data-table-features";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createColumnHelper } from "@tanstack/react-table";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

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
  const rows = timesheets ? [...timesheets.pending, ...timesheets.reviewed] : undefined;

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
        <h2 className="panel-title">Timesheets</h2>
        <p className="panel-copy">
          Weekly hours workers at {company} have submitted. Approving or rejecting a pending timesheet records
          that decision.
        </p>
        {error ? <p className="field-error">{error}</p> : null}
        {rows === undefined ? (
          <p className="invite-note">Loading timesheets…</p>
        ) : (
          <TimesheetTable rows={rows} busyId={busyId} onDecide={onDecide} />
        )}
      </section>
    </>
  );
}

const timesheetColumns = createColumnHelper<DataTableFeatures, TimesheetRow>();

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
  const columns = useMemo(
    () =>
      timesheetColumns.columns([
        timesheetColumns.accessor((row) => `${row.workerName} ${row.workerEmail}`, {
          id: "worker",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Worker" />,
          cell: ({ row }) => (
            <TablePerson
              name={row.original.workerName}
              detail={row.original.workerEmail ? emailHandle(row.original.workerEmail) : "No email on file"}
            />
          ),
          sortFn: "text",
        }),
        timesheetColumns.accessor("jobSiteName", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job site" />,
          cell: ({ row }) => <TableMuted>{row.original.jobSiteName}</TableMuted>,
          sortFn: "text",
        }),
        timesheetColumns.accessor("weekStart", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Week" />,
          cell: ({ row }) => <TableMuted>{`${formatDay(row.original.weekStart)} – ${formatDay(row.original.weekEnd)}`}</TableMuted>,
          sortFn: "alphanumeric",
        }),
        timesheetColumns.accessor("totalHours", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Hours" align="end" />,
          cell: ({ row }) => (
            <div className="table-figure-stack">
              <TableFigure value={`${formatHours(row.original.totalHours)}h`} />
              <span className="table-person-detail">
                {dayLabels.map(([key, label]) => `${label} ${formatHours(row.original.hours[key])}`).join(" · ")}
              </span>
            </div>
          ),
          sortFn: "alphanumeric",
        }),
        timesheetColumns.accessor((row) => row.comments ?? "", {
          id: "comments",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Comments" />,
          cell: ({ row }) => <TableMuted>{row.original.comments || "No comments"}</TableMuted>,
          sortFn: "text",
        }),
        timesheetColumns.accessor((row) => [row.status, row.rejectionReason].filter(Boolean).join(" "), {
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
        ...(onDecide
          ? [
              timesheetColumns.display({
                id: "actions",
                enableSorting: false,
                enableGlobalFilter: false,
                cell: ({ row }) => {
                  if (row.original.status !== "pending") return null;
                  const busy = busyId === row.original.timesheetId;
                  return (
                    <div className="row-actions">
                      <button type="button" className="row-action" disabled={busy} onClick={() => onDecide(row.original, "approved")}>
                        {busy ? "Saving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="row-action row-action-danger"
                        disabled={busy}
                        onClick={() => onDecide(row.original, "rejected")}
                      >
                        {busy ? "Saving…" : "Reject"}
                      </button>
                    </div>
                  );
                },
              }),
            ]
          : []),
      ]),
    [busyId, onDecide],
  );

  return (
    <AppDataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Filter timesheets..."
      filters={[{ id: "status", label: "Status", value: (row) => statusLabel(row.status) }]}
    />
  );
}

// Returns the plain status label for a timesheet.
function statusLabel(status: TimesheetStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

// Shows the timesheet review page for the signed-in admin's company.
export function AdminTimesheetsPage() {
  return <TimesheetsPanel />;
}
