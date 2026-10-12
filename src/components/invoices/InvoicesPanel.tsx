"use client";

import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

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
        <h2 className="panel-title">Waiting for review</h2>
        <p className="panel-copy">
          Invoices workers at {company} have uploaded. Approving or rejecting an invoice records that decision.
        </p>
        {error ? <p className="field-error">{error}</p> : null}
        {invoices === undefined ? (
          <p className="invite-note">Loading invoices…</p>
        ) : invoices.pending.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">Nothing to review</h3>
            <p className="panel-copy">Invoices waiting for approval will show up here.</p>
          </div>
        ) : (
          <InvoiceTable rows={invoices.pending} busyId={busyId} onDecide={onDecide} />
        )}
      </section>

      {invoices && invoices.reviewed.length > 0 ? (
        <section className="saas-card stack-card">
          <h2 className="panel-title">Reviewed</h2>
          <p className="panel-copy">Invoices already approved or rejected for {company}.</p>
          <InvoiceTable rows={invoices.reviewed} busyId={null} />
        </section>
      ) : null}
    </>
  );
}

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
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Worker</th>
            <th scope="col">Job site</th>
            <th scope="col">Month</th>
            <th scope="col">Amount</th>
            <th scope="col">Files</th>
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
            const busy = busyId === row.invoiceId;
            return (
              <tr key={row.invoiceId}>
                <td>
                  <strong>{row.workerName}</strong>
                  <span className="hours-breakdown">{row.workerEmail || "No email on file"}</span>
                </td>
                <td>{row.jobSiteName}</td>
                <td>{formatMonth(row.invoiceMonth)}</td>
                <td>{formatAmount(row.amount)}</td>
                <td>
                  <InvoiceFiles files={row.files} />
                </td>
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

// Lists the files attached to an invoice, with a link when the file can be opened.
function InvoiceFiles({ files }: { files: InvoiceFile[] }) {
  if (files.length === 0) return <span>No file</span>;
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

// Shows pending, approved, or rejected as a colored label.
function StatusBadge({ status }: { status: InvoiceStatus }) {
  if (status === "approved") return <Badge tone="success">Approved</Badge>;
  if (status === "rejected") return <Badge tone="danger">Rejected</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

// Shows the invoice review page for the signed-in admin's company.
export function AdminInvoicesPage() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "your company";

  return (
    <>
      <header className="page-header">
        <h2 className="page-title">Invoices</h2>
        <p className="page-description">Review invoices uploaded by workers at {company}.</p>
      </header>
      <InvoicesPanel />
    </>
  );
}
