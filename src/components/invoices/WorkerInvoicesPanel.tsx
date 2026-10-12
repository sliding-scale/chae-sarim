"use client";

import { useConfirm } from "@/components/ui/ConfirmDialog";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/layout/RoleGate";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useRef, useState } from "react";

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
    month: "long",
    year: "numeric",
  });
}

// Formats an invoice amount, or a placeholder when the worker left it blank.
function formatAmount(amount: number | null) {
  if (amount === null) return "No amount";
  return amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
export function WorkerInvoicesPanel() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jobSiteId = jobSiteChoice ?? sites?.[0]?.jobSiteId ?? "";

  // Adds chosen files that are a PDF, PNG, or JPG under 10 MB.
  function onPickFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    let message = "";
    for (const file of list) {
      if (!contentType(file)) {
        message = "Upload a PDF, PNG, or JPG.";
        continue;
      }
      if (file.size > maxBytes) {
        message = "Each file must be 10 MB or smaller.";
        continue;
      }
      const duplicate = next.some((item) => item.name === file.name && item.size === file.size);
      if (!duplicate) next.push(file);
    }
    if (next.length > maxFiles) {
      message = "Upload between 1 and 10 files.";
      setFiles(next.slice(0, maxFiles));
    } else {
      setFiles(next);
    }
    setError(message);
  }

  // Uploads the chosen files and submits the invoice for review.
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jobSiteId || files.length === 0) return;
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
      const amountText = amount.trim();
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
      <section className="saas-card invite-panel">
        <h2 className="panel-title">Upload an invoice</h2>
        <p className="panel-copy">
          Send a PDF, PNG, or JPG for {company}. An admin reviews it after you upload.
        </p>
        {sites === undefined ? (
          <p className="invite-note">Loading job sites…</p>
        ) : sites.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">No job sites yet</h3>
            <p className="panel-copy">Ask an admin to add a job site before you upload an invoice.</p>
          </div>
        ) : (
          <form className="timesheet-form" onSubmit={onSubmit} noValidate>
            <div className="timesheet-fields">
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
                  Amount
                </label>
                <input
                  id="invoice-amount"
                  className="input-saas"
                  inputMode="decimal"
                  value={amount}
                  placeholder="Optional"
                  disabled={busy}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="file-field">
                <span className="form-label" id="invoice-files-label">
                  Files
                  <RequiredMark />
                </span>
                <div className="file-picker">
                  <input
                    ref={fileInputRef}
                    id="invoice-files"
                    className="sr-only"
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
                    multiple
                    disabled={busy}
                    tabIndex={-1}
                    onChange={(event) => {
                      onPickFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy}
                    aria-labelledby="invoice-files-label"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose files
                  </button>
                  {files.length === 0 ? (
                    <span className="file-picker-name">No file chosen</span>
                  ) : (
                    <div className="file-picker-files">
                      {files.map((file) => (
                        <div key={`${file.name}-${file.size}`} className="file-picker-row">
                          <span className="file-picker-name">{file.name}</span>
                          <button
                            type="button"
                            className="row-action"
                            disabled={busy}
                            onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="invite-note">PDF, PNG, or JPG. Each file can be up to 10 MB.</p>
            <div className="timesheet-submit">
              <button className="btn-primary" type="submit" disabled={busy || !jobSiteId || files.length === 0}>
                {busy ? "Uploading…" : "Submit invoice"}
              </button>
            </div>
            {error ? <p className="field-error">{error}</p> : null}
          </form>
        )}
      </section>

      <section className="saas-card stack-card">
        <h2 className="panel-title">Your invoices</h2>
        <p className="panel-copy">Invoices you have uploaded for {company}.</p>
        {invoices === undefined ? (
          <p className="invite-note">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">No invoices yet</h3>
            <p className="panel-copy">An invoice you upload will show up here.</p>
          </div>
        ) : (
          <InvoiceTable rows={invoices} />
        )}
      </section>
    </>
  );
}

// Renders the worker's uploaded invoices.
function InvoiceTable({ rows }: { rows: InvoiceRow[] }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Job site</th>
            <th scope="col">Month</th>
            <th scope="col">Amount</th>
            <th scope="col">Files</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.invoiceId}>
              <td>{row.jobSiteName}</td>
              <td>{formatMonth(row.invoiceMonth)}</td>
              <td>{formatAmount(row.amount)}</td>
              <td>
                <div className="file-links">
                  {row.files.map((file) =>
                    file.url ? (
                      <a key={file.url} href={file.url} target="_blank" rel="noreferrer">
                        {file.fileName}
                      </a>
                    ) : (
                      <span key={file.fileName}>{file.fileName}</span>
                    ),
                  )}
                </div>
              </td>
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
function StatusBadge({ status }: { status: InvoiceStatus }) {
  if (status === "approved") return <Badge tone="success">Approved</Badge>;
  if (status === "rejected") return <Badge tone="danger">Rejected</Badge>;
  if (status === "draft") return <Badge tone="neutral">Draft</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

// Shows the invoice page for the signed-in worker.
export function WorkerInvoicesPage() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "your company";

  return (
    <>
      <header className="page-header">
        <h2 className="page-title">Invoices</h2>
        <p className="page-description">Upload an invoice for a job site at {company}.</p>
      </header>
      <WorkerInvoicesPanel />
    </>
  );
}
