"use client";

import {
  AppDataTable,
  DataTableColumnHeader,
  TableFigure,
  TableFiles,
  TableIconText,
  TableLongText,
  TableMuted,
  TableStatus,
} from "@/components/lists/AppDataTable";
import type { DataTableFeatures } from "@/components/lists/data-table-features";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { FileUpload } from "@/components/ui/file-upload";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { ContentHeading } from "@/components/dashboard/ContentHeading";
import { NoSitesNotice } from "@/components/dashboard/NoSitesNotice";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createColumnHelper } from "@tanstack/react-table";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { CalendarDays, FileUp, MapPin } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

const maxFiles = 10;
const maxBytes = 10 * 1024 * 1024;

type InvoiceStatus = "draft" | "pending" | "approved" | "rejected";

type InvoiceRow = {
  invoiceId: Id<"workerInvoices">;
  jobSiteName: string;
  invoiceMonth: string;
  amount: number | null;
  files: { fileName: string; url: string | null }[];
  status: InvoiceStatus;
  rejectionReason: string | null;
};

// Reads a user-facing message from a Convex error.
function errorText(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return fallback;
}

// Returns the current month as YYYY-MM in the browser's calendar.
function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
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

// Picks a content type Convex can check for a PDF, PNG, or JPG.
function contentType(file: File) {
  if (file.type === "application/pdf" || file.type === "image/png" || file.type === "image/jpeg") return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

// Lets a worker upload an invoice for one job site in their company.
export function WorkerInvoicesPanel({ query = "" }: { query?: string }) {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "your company";
  const sites = useQuery(api.jobSites.queries.listWorkerJobSites);
  const invoices = useQuery(api.invoices.queries.listMyInvoices);
  const generateInvoiceUploadUrl = useMutation(api.invoices.mutations.generateInvoiceUploadUrl);
  const submitInvoice = useMutation(api.invoices.mutations.submitInvoice);
  const [jobSiteChoice, setJobSiteChoice] = useState<Id<"jobSites"> | null>(null);
  const [invoiceMonth, setInvoiceMonth] = useState(currentMonth);
  const [amount, setAmount] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const jobSiteId = jobSiteChoice ?? sites?.[0]?.jobSiteId ?? "";

  // Uploads the chosen files and submits the invoice for review.
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jobSiteId || files.length === 0) return;
    const amountText = amount.trim();
    if (amountText && !/^\d+(\.\d{1,2})?$/.test(amountText)) {
      setError("Enter the amount in rupees, using numbers only.");
      return;
    }
    if (amountText && Number(amountText) <= 0) {
      setError("Enter an amount greater than zero, or leave it blank.");
      return;
    }
    const { accepted } = await confirm({
      title: "Submit invoice",
      body: "Submit this invoice for review?",
      confirmLabel: "Submit invoice",
      tone: "primary",
    });
    if (!accepted) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = [];
      for (const file of files) {
        const type = contentType(file);
        if (!type) throw new Error("Upload a PDF, PNG, or JPG.");
        const uploadUrl = await generateInvoiceUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": type },
          body: file,
        });
        const body = (await response.json()) as { storageId?: Id<"_storage"> };
        if (!response.ok || !body.storageId) throw new Error("Could not upload that file.");
        uploaded.push({ fileStorageId: body.storageId, fileName: file.name });
      }
      await submitInvoice({
        jobSiteId,
        invoiceMonth,
        amount: amountText ? Number(amountText) : undefined,
        files: uploaded,
      });
      setFiles([]);
      setAmount("");
    } catch (caught) {
      setError(errorText(caught, caught instanceof Error ? caught.message : "Could not submit that invoice."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ContentHeading title="Invoices" description="Upload an invoice and follow its review." />
      <section className="worker-card time-off-card">
        <div className="time-off-head">
          <span className="time-off-icon">
            <FileUp aria-hidden="true" />
          </span>
          <div className="time-off-copy">
            <h2 className="panel-title">Upload an invoice</h2>
            <p className="panel-copy">
              Send a PDF, PNG, or JPG for {company}. An administrator reviews it after you upload.
            </p>
          </div>
        </div>
        {sites === undefined ? (
          <p className="invite-note">Loading job sites…</p>
        ) : sites.length === 0 ? (
          <NoSitesNotice message="Ask an administrator to assign a job site before you upload an invoice." />
        ) : (
          <form className="time-off-form" onSubmit={onSubmit} noValidate>
            <div className="time-off-grid">
              <div>
                <label className="form-label" htmlFor="invoice-site">
                  Job site
                  <RequiredMark />
                </label>
                <select
                  id="invoice-site"
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
                <label className="form-label" htmlFor="invoice-month">
                  Month
                  <RequiredMark />
                </label>
                <input
                  id="invoice-month"
                  className="input-saas"
                  type="month"
                  value={invoiceMonth}
                  max={currentMonth()}
                  disabled={busy}
                  onChange={(event) => setInvoiceMonth(event.target.value)}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="invoice-amount">
                  Amount (PKR)
                </label>
                <input
                  id="invoice-amount"
                  className="input-saas"
                  inputMode="decimal"
                  value={amount}
                  placeholder="Optional"
                  disabled={busy}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (next === "" || /^\d*\.?\d{0,2}$/.test(next)) setAmount(next);
                  }}
                />
              </div>
              <div className="is-full">
                <span className="form-label">
                  Files
                  <RequiredMark />
                </span>
                <FileUpload
                  files={files}
                  disabled={busy}
                  maxFiles={maxFiles}
                  maxBytes={maxBytes}
                  onFilesChange={setFiles}
                  onReject={setError}
                />
              </div>
            </div>
            <div className="timesheet-submit">
              <button className="btn-primary" type="submit" disabled={busy || !jobSiteId || files.length === 0}>
                {busy ? "Uploading…" : "Submit invoice"}
              </button>
            </div>
            {error ? <p className="field-error">{error}</p> : null}
          </form>
        )}
      </section>

      <section className="worker-card">
        <h2 className="panel-title">Your invoices</h2>
        <p className="panel-copy">Invoices you have uploaded for {company}.</p>
        {invoices === undefined ? (
          <p className="invite-note">Loading invoices…</p>
        ) : (
          <InvoiceTable rows={invoices} query={query} />
        )}
      </section>
    </>
  );
}

const workerInvoiceColumns = createColumnHelper<DataTableFeatures, InvoiceRow>();

// Renders the worker's uploaded invoices.
function InvoiceTable({ rows, query }: { rows: InvoiceRow[]; query: string }) {
  const columns = useMemo(
    () =>
      workerInvoiceColumns.columns([
        workerInvoiceColumns.accessor("jobSiteName", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job Site" />,
          cell: ({ row }) => <TableIconText icon={MapPin}>{row.original.jobSiteName}</TableIconText>,
          sortFn: "text",
        }),
        workerInvoiceColumns.accessor("invoiceMonth", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Month" />,
          cell: ({ row }) => <TableIconText icon={CalendarDays}>{formatMonth(row.original.invoiceMonth)}</TableIconText>,
          sortFn: "alphanumeric",
        }),
        workerInvoiceColumns.accessor("amount", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Amount (PKR)" align="end" />,
          cell: ({ row }) =>
            row.original.amount === null ? (
              <TableMuted>No amount</TableMuted>
            ) : (
              <TableFigure value={formatAmount(row.original.amount)} />
            ),
          sortFn: "alphanumeric",
        }),
        workerInvoiceColumns.accessor((row) => row.files.map((file) => file.fileName).join(" "), {
          id: "files",
          header: () => <span className="table-sort">Files</span>,
          enableSorting: false,
          cell: ({ row }) => <TableFiles files={row.original.files} />,
        }),
        workerInvoiceColumns.accessor("status", {
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
        workerInvoiceColumns.accessor((row) => row.rejectionReason ?? "", {
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
      searchPlaceholder="Search by job site or month…"
      initialSearch={query}
      rowSearch={invoiceSearch}
      filters={[{ id: "status", label: "Status", value: (row) => statusLabel(row.status) }]}
      empty={{
        title: "No invoices yet",
        description: "Uploaded invoices will appear here once you submit them.",
      }}
    />
  );
}

// Joins the fields a worker can type to find one invoice.
function invoiceSearch(row: InvoiceRow) {
  return [
    row.jobSiteName,
    formatMonth(row.invoiceMonth),
    row.invoiceMonth,
    row.files.map((file) => file.fileName).join(" "),
    row.amount === null ? "" : String(row.amount),
    statusLabel(row.status),
    row.rejectionReason ?? "",
  ].join(" ");
}

// Returns the plain status label for an invoice.
function statusLabel(status: InvoiceStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "draft") return "Draft";
  return "Pending";
}

// Shows the invoice page for the signed-in worker.
export function WorkerInvoicesPage({ query = "" }: { query?: string }) {
  return <WorkerInvoicesPanel query={query} />;
}
