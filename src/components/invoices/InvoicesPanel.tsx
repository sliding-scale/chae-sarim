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
    month: "long",
    year: "numeric",
  });
}

// Formats an invoice amount, or a placeholder when the worker left it blank.
function formatAmount(amount: number | null) {
  if (amount === null) return "No amount";
  return amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Lets an admin review submitted invoices and approve or reject the ones still pending.
export function InvoicesPanel() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "this company";
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
      <section className="saas-card invite-panel">
        <h2 className="panel-title">Invoices</h2>
        <p className="panel-copy">
          Invoices workers at {company} have uploaded. Approving or rejecting a pending invoice records that
          decision.
        </p>
        {error ? <p className="field-error">{error}</p> : null}
        {rows === undefined ? (
          <p className="invite-note">Loading invoices…</p>
        ) : (
          <InvoiceTable rows={rows} busyId={busyId} onDecide={onDecide} />
        )}
      </section>
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
          cell: ({ row }) => (
            <TablePerson
              name={row.original.workerName}
              detail={row.original.workerEmail ? emailHandle(row.original.workerEmail) : "No email on file"}
            />
          ),
          sortFn: "text",
        }),
        invoiceColumns.accessor("jobSiteName", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job site" />,
          cell: ({ row }) => <TableMuted>{row.original.jobSiteName}</TableMuted>,
          sortFn: "text",
        }),
        invoiceColumns.accessor("invoiceMonth", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Month" />,
          cell: ({ row }) => <TableMuted>{formatMonth(row.original.invoiceMonth)}</TableMuted>,
          sortFn: "alphanumeric",
        }),
        invoiceColumns.accessor("amount", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" align="end" />,
          cell: ({ row }) =>
            row.original.amount === null ? (
              <TableMuted>No amount</TableMuted>
            ) : (
              <TableFigure value={formatAmount(row.original.amount)} negative={row.original.amount < 0} />
            ),
          sortFn: "alphanumeric",
        }),
        invoiceColumns.accessor((row) => row.files.map((file) => file.fileName).join(" "), {
          id: "files",
          header: "Files",
          cell: ({ row }) => <InvoiceFiles files={row.original.files} />,
          enableSorting: false,
        }),
        invoiceColumns.accessor((row) => [row.status, row.rejectionReason].filter(Boolean).join(" "), {
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
              invoiceColumns.display({
                id: "actions",
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
      columns={columns}
      data={rows}
      searchPlaceholder="Filter invoices..."
      filters={[{ id: "status", label: "Status", value: (row) => statusLabel(row.status) }]}
    />
  );
}

// Lists the files attached to an invoice, with a link when the file can be opened.
function InvoiceFiles({ files }: { files: InvoiceFile[] }) {
  if (files.length === 0) return <TableMuted>No file</TableMuted>;
  return (
    <span className="file-links">
      {files.map((file, index) =>
        file.url ? (
          <a key={`${file.fileName}-${index}`} className="row-action" href={file.url} target="_blank" rel="noreferrer">
            {file.fileName}
          </a>
        ) : (
          <span key={`${file.fileName}-${index}`}>{file.fileName}</span>
        ),
      )}
    </span>
  );
}

// Returns the plain status label for an invoice.
function statusLabel(status: InvoiceStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

// Shows the invoice review page for the signed-in admin's company.
export function AdminInvoicesPage() {
  return <InvoicesPanel />;
}
