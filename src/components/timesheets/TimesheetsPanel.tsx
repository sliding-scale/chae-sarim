"use client";

import { ContentHeading } from "@/components/dashboard/ContentHeading";
import { ReviewBoard } from "@/components/dashboard/ReviewBoard";
import {
  AppDataTable,
  DataTableColumnHeader,
  TableFigure,
  TableIconText,
  TableJobSite,
  TableLongText,
  TablePerson,
  TableStatus,
  formatDateRange,
} from "@/components/lists/AppDataTable";
import type { DataTableFeatures } from "@/components/lists/data-table-features";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createColumnHelper } from "@tanstack/react-table";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { CalendarDays } from "lucide-react";
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

// Formats an hour count, keeping a decimal only when the value is not whole.
function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

// Lets an admin review submitted timesheets and approve or reject the ones still pending.
export function TimesheetsPanel({ status }: { status?: "approved" }) {
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
      <ContentHeading title="Timesheets" description="Review the weekly hours workers submit." />
      <ReviewBoard title="Submitted timesheets" rows={rows} error={error}>
      {rows === undefined ? (
        <p className="invite-note">Loading timesheets…</p>
      ) : (
        <TimesheetTable rows={rows} busyId={busyId} onDecide={onDecide} />
      )}
    </ReviewBoard>
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
          cell: ({ row }) => <TablePerson name={row.original.workerName} />,
          sortFn: "text",
        }),
        timesheetColumns.accessor("jobSiteName", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job Site" />,
          cell: ({ row }) => (
            <TableJobSite name={row.original.jobSiteName} />
          ),
          sortFn: "text",
        }),
        timesheetColumns.accessor("weekStart", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Week" />,
          cell: ({ row }) => (
            <TableIconText icon={CalendarDays}>{formatDateRange(row.original.weekStart, row.original.weekEnd)}</TableIconText>
          ),
          sortFn: "alphanumeric",
        }),
        timesheetColumns.accessor("totalHours", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Hours" />,
          cell: ({ row }) => (
            <span className="day-hours">
              <TableFigure value={`${formatHours(row.original.totalHours)} h`} />
              <span className="table-muted">
                {dayLabels.map(([key, label]) => `${label} ${formatHours(row.original.hours[key])}`).join(" · ")}
              </span>
            </span>
          ),
          sortFn: "alphanumeric",
        }),
        timesheetColumns.accessor((row) => row.comments ?? "", {
          id: "comments",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Comments" />,
          cell: ({ row }) => <TableLongText text={row.original.comments} title="Comments" />,
          sortFn: "text",
        }),
        timesheetColumns.accessor("status", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => (
            <TableStatus
              label={statusLabel(row.original.status)}
              tone={row.original.status === "approved" ? "success" : row.original.status === "rejected" ? "danger" : "warning"}
            />
          ),
          sortFn: "text",
        }),
        timesheetColumns.accessor((row) => row.rejectionReason ?? "", {
          id: "rejectionReason",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Rejection reason" />,
          cell: ({ row }) => <TableLongText text={row.original.rejectionReason} title="Rejection reason" tone="danger" />,
          sortFn: "text",
        }),
        ...(onDecide
          ? [
              timesheetColumns.display({
                id: "actions",
                header: () => <span className="table-sort">Actions</span>,
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
      key={status ?? "all"}
      columns={columns}
      data={rows}
      searchPlaceholder="Search by worker or job site…"
      initialFacets={status === "approved" ? { status: ["Approved"] } : undefined}
      filters={[
        { id: "week", label: "Week", value: (row) => formatDateRange(row.weekStart, row.weekEnd) },
        { id: "status", label: "Status", value: (row) => statusLabel(row.status) },
      ]}
      empty={{
        title: "No timesheets yet",
        description: "When workers submit weekly hours, they will appear here for your review.",
      }}
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
export function AdminTimesheetsPage({ status }: { status?: "approved" }) {
  return <TimesheetsPanel status={status} />;
}
