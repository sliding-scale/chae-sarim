"use client";

import { ContentHeading } from "@/components/dashboard/ContentHeading";
import { ReviewBoard } from "@/components/dashboard/ReviewBoard";
import {
  AppDataTable,
  DataTableColumnHeader,
  TableFigure,
  TableFiles,
  TableIconText,
  TableJobSite,
  TableLongText,
  TableMuted,
  TablePerson,
  TableStatus,
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

type InvoiceStatus = "pending" | "approved" | "rejected";

type InvoiceFile = {
  fileName: string;
  url: string | null;
};

type InvoiceRow = {
  invoiceId: Id<"workerInvoices">;
  workerName: string;
  workerEmail: string;
  jobSiteName: string;
  invoiceMonth: string;
  amount: number | null;
  files: InvoiceFile[];
  status: InvoiceStatus;
  rejectionReason: string | null;
};

// Reads a user-facing message from a Convex error.
function errorText(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return fallback;
}

// Formats a YYYY-MM month without shifting it across time zones.
function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

// Formats an invoice amount as a number. The column heading carries the PKR label.
function formatAmount(amount: number | null) {
  if (amount === null) return "No amount";
  return amount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Lets an admin review submitted invoices and approve or reject the ones still pending.
export function InvoicesPanel({ status }: { status?: "approved" }) {
  const invoices = useQuery(api.invoices.queries.listInvoices);
  const decideInvoice = useMutation(api.invoices.mutations.decideInvoice);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<Id<"workerInvoices"> | null>(null);
  const confirm = useConfirm();
  const rows = invoices ? [...invoices.pending, ...invoices.reviewed] : undefined;

  // Approves or rejects one pending invoice after the admin confirms.
  async function onDecide(row: InvoiceRow, status: "approved" | "rejected") {
    const approving = status === "approved";
    const { accepted, note } = await confirm({
      title: approving ? "Approve invoice" : "Reject invoice",
      body: `${approving ? "Approve" : "Reject"} the invoice for ${row.workerName}?`,
      confirmLabel: approving ? "Approve" : "Reject",
      tone: approving ? "primary" : "danger",
      noteLabel: approving ? undefined : "Reason",
    });
    if (!accepted) return;
    setBusyId(row.invoiceId);
    setError("");
    try {
      await decideInvoice({
        invoiceId: row.invoiceId,
        status,
        ...(status === "rejected" ? { rejectionReason: note } : {}),
      });
    } catch (caught) {
      setError(errorText(caught, `Could not ${status === "approved" ? "approve" : "reject"} that invoice.`));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <ContentHeading title="Invoices" description="Review the invoices workers upload." />
      <ReviewBoard title="Submitted invoices" rows={rows} error={error}>
      {rows === undefined ? (
        <p className="invite-note">Loading invoices…</p>
      ) : (
        <InvoiceTable rows={rows} busyId={busyId} onDecide={onDecide} />
      )}
    </ReviewBoard>
    </>
  );
}

const invoiceColumns = createColumnHelper<DataTableFeatures, InvoiceRow>();

// Renders one invoice table, with approve and reject actions when a handler is provided.
function InvoiceTable({
  rows,
  busyId,
  onDecide,
}: {
  rows: InvoiceRow[];
  busyId: Id<"workerInvoices"> | null;
  onDecide?: (row: InvoiceRow, status: "approved" | "rejected") => void;
}) {
  const columns = useMemo(
    () =>
      invoiceColumns.columns([
        invoiceColumns.accessor((row) => `${row.workerName} ${row.workerEmail}`, {
          id: "worker",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Worker" />,
          cell: ({ row }) => <TablePerson name={row.original.workerName} detail={row.original.workerEmail} />,
          sortFn: "text",
        }),
        invoiceColumns.accessor("jobSiteName", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job Site" />,
          cell: ({ row }) => <TableJobSite name={row.original.jobSiteName} />,
          sortFn: "text",
        }),
        invoiceColumns.accessor("invoiceMonth", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Month" />,
          cell: ({ row }) => <TableIconText icon={CalendarDays}>{formatMonth(row.original.invoiceMonth)}</TableIconText>,
          sortFn: "alphanumeric",
        }),
        invoiceColumns.accessor("amount", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Amount (PKR)" align="end" />,
          cell: ({ row }) =>
            row.original.amount === null ? (
              <TableMuted>No amount</TableMuted>
            ) : (
              <TableFigure value={formatAmount(row.original.amount)} />
            ),
          sortFn: "alphanumeric",
        }),
        invoiceColumns.accessor((row) => row.files.map((file) => file.fileName).join(" "), {
          id: "files",
          header: () => <span className="table-sort">Files</span>,
          cell: ({ row }) => <TableFiles files={row.original.files} />,
          enableSorting: false,
        }),
        invoiceColumns.accessor("status", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => (
            <TableStatus
              label={statusLabel(row.original.status)}
              tone={row.original.status === "approved" ? "success" : row.original.status === "rejected" ? "danger" : "warning"}
            />
          ),
          sortFn: "text",
        }),
        invoiceColumns.accessor((row) => row.rejectionReason ?? "", {
          id: "rejectionReason",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Rejection reason" />,
          cell: ({ row }) => <TableLongText text={row.original.rejectionReason} title="Rejection reason" tone="danger" />,
          sortFn: "text",
        }),
        ...(onDecide
          ? [
              invoiceColumns.display({
                id: "actions",
                header: () => <span className="table-sort">Actions</span>,
                enableSorting: false,
                enableGlobalFilter: false,
                cell: ({ row }) => {
                  if (row.original.status !== "pending") return null;
                  const busy = busyId === row.original.invoiceId;
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
        { id: "month", label: "Month", value: (row) => formatMonth(row.invoiceMonth) },
        { id: "status", label: "Status", value: (row) => statusLabel(row.status) },
      ]}
      empty={{
        title: "No invoices yet",
        description: "When workers upload invoices, they will appear here for your review.",
      }}
    />
  );
}

// Returns the plain status label for an invoice.
function statusLabel(status: InvoiceStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

// Shows the invoice review page for the signed-in admin's company.
export function AdminInvoicesPage({ status }: { status?: "approved" }) {
  return <InvoicesPanel status={status} />;
}
