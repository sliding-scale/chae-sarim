"use client";

import { ReviewBoard } from "@/components/dashboard/ReviewBoard";
import {
  AppDataTable,
  DataTableColumnHeader,
  TableIconText,
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
import { CalendarDays, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

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

// Lets an admin review submitted holiday requests and approve or reject the ones still pending.
export function HolidaysPanel() {
  const holidays = useQuery(api.holidays.queries.listHolidays);
  const decideHoliday = useMutation(api.holidays.mutations.decideHoliday);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<Id<"holidayRequests"> | null>(null);
  const confirm = useConfirm();
  const rows = holidays ? [...holidays.pending, ...holidays.reviewed] : undefined;

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
    <ReviewBoard title="Submitted Holidays" noun="holidays" rows={rows} error={error}>
      {rows === undefined ? (
        <p className="invite-note">Loading holiday requests…</p>
      ) : (
        <HolidayTable rows={rows} busyId={busyId} onDecide={onDecide} />
      )}
    </ReviewBoard>
  );
}

const holidayColumns = createColumnHelper<DataTableFeatures, HolidayRow>();

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
  const columns = useMemo(
    () =>
      holidayColumns.columns([
        holidayColumns.accessor((row) => `${row.workerName} ${row.workerEmail}`, {
          id: "worker",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Worker" />,
          cell: ({ row }) => <TablePerson name={row.original.workerName} />,
          sortFn: "text",
        }),
        holidayColumns.accessor("jobSiteName", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job site" />,
          cell: ({ row }) => <TableIconText icon={MapPin}>{row.original.jobSiteName}</TableIconText>,
          sortFn: "text",
        }),
        holidayColumns.accessor("startDate", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Dates" />,
          cell: ({ row }) => (
            <TableIconText icon={CalendarDays}>{formatDateRange(row.original.startDate, row.original.endDate)}</TableIconText>
          ),
          sortFn: "alphanumeric",
        }),
        holidayColumns.accessor("reason", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Reason" />,
          cell: ({ row }) => <TableLongText text={row.original.reason} title="Reason" />,
          sortFn: "text",
        }),
        holidayColumns.accessor("status", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => (
            <TableStatus
              label={statusLabel(row.original.status)}
              tone={row.original.status === "approved" ? "success" : row.original.status === "rejected" ? "danger" : "warning"}
            />
          ),
          sortFn: "text",
        }),
        holidayColumns.accessor((row) => row.rejectionReason ?? "", {
          id: "rejectionReason",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Rejection reason" />,
          cell: ({ row }) => <TableLongText text={row.original.rejectionReason} title="Rejection reason" />,
          sortFn: "text",
        }),
        ...(onDecide
          ? [
              holidayColumns.display({
                id: "actions",
                header: "Actions",
                enableSorting: false,
                enableGlobalFilter: false,
                cell: ({ row }) => {
                  if (row.original.status !== "pending") return null;
                  const busy = busyId === row.original.holidayRequestId;
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
      searchPlaceholder="Search by worker, job site or reason..."
      filters={[{ id: "status", label: "Status", value: (row) => statusLabel(row.status) }]}
      empty={{
        title: "No holiday requests yet",
        description: "When workers request time off, they will appear here for your review.",
      }}
    />
  );
}

// Returns the plain status label for a holiday request.
function statusLabel(status: HolidayStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

// Shows the holiday review page for the signed-in admin's company.
export function AdminHolidaysPage() {
  return <HolidaysPanel />;
}
