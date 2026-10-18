"use client";

import { JobSiteArt } from "@/components/dashboard/AdminArt";
import { ContentHeading } from "@/components/dashboard/ContentHeading";
import { AppDataTable, DataTableColumnHeader, TableIconText, TableMuted, TableName } from "@/components/lists/AppDataTable";
import type { DataTableFeatures } from "@/components/lists/data-table-features";
import { useWorkspace } from "@/components/layout/RoleGate";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createColumnHelper } from "@tanstack/react-table";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { UserAvatar } from "@/components/users/UserAvatar";
import { MapPin, MapPinPlus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Reads a user-facing message from a Convex error.
function errorText(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return fallback;
}

// Lets an admin add, edit, and remove job sites for their company.
export function JobSitesPanel({ query = "" }: { query?: string }) {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "this company";
  const sites = useQuery(api.jobSites.queries.listJobSites);
  const createJobSite = useMutation(api.jobSites.mutations.createJobSite);
  const updateJobSite = useMutation(api.jobSites.mutations.updateJobSite);
  const removeJobSite = useMutation(api.jobSites.mutations.removeJobSite);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<Id<"jobSites"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const confirm = useConfirm();

  // Creates a job site from the form.
  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("create");
    setError("");
    try {
      await createJobSite({ name, address });
      setName("");
      setAddress("");
    } catch (caught) {
      setError(errorText(caught, "Could not add that job site."));
    } finally {
      setBusyKey(null);
    }
  }

  // Opens a site row for editing.
  function startEdit(jobSiteId: Id<"jobSites">, currentName: string, currentAddress: string | null) {
    setEditingId(jobSiteId);
    setEditName(currentName);
    setEditAddress(currentAddress ?? "");
    setError("");
  }

  // Saves the name and address of the site being edited.
  async function onSave(jobSiteId: Id<"jobSites">) {
    setBusyKey(jobSiteId);
    setError("");
    try {
      await updateJobSite({ jobSiteId, name: editName, address: editAddress });
      setEditingId(null);
    } catch (caught) {
      setError(errorText(caught, "Could not save that job site."));
    } finally {
      setBusyKey(null);
    }
  }

  // Removes a job site after the admin confirms.
  async function onRemove(jobSiteId: Id<"jobSites">, siteName: string) {
    const { accepted } = await confirm({
      title: "Remove job site",
      body: `Remove ${siteName}?`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!accepted) return;
    setBusyKey(jobSiteId);
    setError("");
    try {
      await removeJobSite({ jobSiteId });
      if (editingId === jobSiteId) setEditingId(null);
    } catch (caught) {
      setError(errorText(caught, "Could not remove that job site."));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <ContentHeading title="Job sites" description="Add the places where workers record time." />
      <section className="admin-hero is-site">
        <div className="admin-hero-head">
          <span className="admin-hero-icon">
            <MapPinPlus aria-hidden="true" />
          </span>
          <div>
            <h2 className="panel-title">Add a job site</h2>
            <p className="panel-copy">Add a place where workers at {company} record time.</p>
          </div>
        </div>
        <form className="site-form" onSubmit={onCreate} noValidate>
          <div>
            <label className="form-label" htmlFor="site-name">
              Name
              <RequiredMark />
            </label>
            <input
              id="site-name"
              className="input-saas"
              name="name"
              value={name}
              placeholder="North warehouse"
              disabled={busyKey === "create"}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "site-form-error" : undefined}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError("");
              }}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="site-address">
              Address
            </label>
            <input
              id="site-address"
              className="input-saas"
              name="address"
              value={address}
              placeholder="Optional"
              disabled={busyKey === "create"}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={busyKey === "create"}>
            {busyKey === "create" ? "Adding…" : "Add job site"}
          </button>
          {error ? (
            <p id="site-form-error" className="field-error">
              {error}
            </p>
          ) : null}
        </form>
        <JobSiteArt />
      </section>

      <section className="admin-table-card">
        <h2 className="panel-title">Job sites</h2>
        <p className="panel-copy">Sites for {company}. A site that already has records cannot be removed.</p>
        {sites === undefined ? (
          <p className="invite-note">Loading job sites…</p>
        ) : (
          <SiteTable
            query={query}
            rows={sites}
            editingId={editingId}
            editName={editName}
            editAddress={editAddress}
            busyKey={busyKey}
            onEditName={setEditName}
            onEditAddress={setEditAddress}
            onStartEdit={startEdit}
            onCancel={() => setEditingId(null)}
            onSave={onSave}
            onRemove={onRemove}
          />
        )}
      </section>
    </>
  );
}

type SiteRow = {
  jobSiteId: Id<"jobSites">;
  name: string;
  address: string | null;
  workers: { name: string }[];
};

const siteColumns = createColumnHelper<DataTableFeatures, SiteRow>();

// Opens the workers list already searched for this person.
function workerSearchHref(name: string) {
  return `/dashboard/admin/workers?q=${encodeURIComponent(name)}`;
}

// Shows one assigned worker's initials, their name on hover, and a link into the workers search.
function WorkerFace({ name }: { name: string }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  function showTip(element: HTMLElement) {
    const box = element.getBoundingClientRect();
    setTip({ x: box.left + box.width / 2, y: box.top });
  }

  return (
    <>
      <Link
        href={workerSearchHref(name)}
        className="admin-face"
        aria-label={`Search workers for ${name}`}
        onMouseEnter={(event) => showTip(event.currentTarget)}
        onMouseLeave={() => setTip(null)}
        onFocus={(event) => showTip(event.currentTarget)}
        onBlur={() => setTip(null)}
      >
        <UserAvatar name={name} />
      </Link>
      {tip
        ? createPortal(
            <span className="admin-face-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
              {name}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}

// Lists every worker assigned to one job site.
function SiteWorkersDialog({
  siteName,
  workers,
  onClose,
}: {
  siteName: string;
  workers: { name: string }[];
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="saas-card confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="panel-title">
          {siteName}
        </h2>
        <p className="panel-copy">
          {workers.length} {workers.length === 1 ? "worker" : "workers"} assigned to this job site.
        </p>
        <div className="site-worker-list">
          {workers.map((worker, index) => (
            <Link key={`${worker.name}-${index}`} href={workerSearchHref(worker.name)} className="table-person site-worker-link">
              <UserAvatar name={worker.name} />
              <span className="table-person-name">{worker.name}</span>
            </Link>
          ))}
        </div>
        <div className="confirm-actions">
          <button ref={closeRef} type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

// Shows the first few assigned workers, and opens the full list when some are hidden.
function SiteWorkers({ siteName, workers }: { siteName: string; workers: { name: string }[] }) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    moreRef.current?.focus();
  }, []);

  if (workers.length === 0) return <TableMuted>None assigned</TableMuted>;
  const shown = workers.slice(0, 4);
  const extra = workers.length - shown.length;
  return (
    <>
      <span className="admin-faces">
        {shown.map((worker, index) => (
          <WorkerFace key={`${worker.name}-${index}`} name={worker.name} />
        ))}
        {extra > 0 ? (
          <button
            ref={moreRef}
            type="button"
            className="admin-faces-more"
            aria-haspopup="dialog"
            aria-label={`View all ${workers.length} workers assigned to ${siteName}`}
            onClick={() => setOpen(true)}
          >
            +{extra}
          </button>
        ) : null}
      </span>
      {open ? <SiteWorkersDialog siteName={siteName} workers={workers} onClose={close} /> : null}
    </>
  );
}

// Renders job sites with inline editing and remove actions.
function SiteTable({
  query,
  rows,
  editingId,
  editName,
  editAddress,
  busyKey,
  onEditName,
  onEditAddress,
  onStartEdit,
  onCancel,
  onSave,
  onRemove,
}: {
  query: string;
  rows: SiteRow[];
  editingId: Id<"jobSites"> | null;
  editName: string;
  editAddress: string;
  busyKey: string | null;
  onEditName: (value: string) => void;
  onEditAddress: (value: string) => void;
  onStartEdit: (jobSiteId: Id<"jobSites">, name: string, address: string | null) => void;
  onCancel: () => void;
  onSave: (jobSiteId: Id<"jobSites">) => void;
  onRemove: (jobSiteId: Id<"jobSites">, name: string) => void;
}) {
  const stateRef = useRef({
    editingId,
    editName,
    editAddress,
    busyKey,
    onEditName,
    onEditAddress,
    onStartEdit,
    onCancel,
    onSave,
    onRemove,
  });
  stateRef.current = {
    editingId,
    editName,
    editAddress,
    busyKey,
    onEditName,
    onEditAddress,
    onStartEdit,
    onCancel,
    onSave,
    onRemove,
  };

  // Leaves edit mode when the pointer goes down outside the name and address fields.
  useEffect(() => {
    if (!editingId) return;
    function onPointerDown(event: PointerEvent) {
      const state = stateRef.current;
      if (!state.editingId || state.busyKey === state.editingId) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest("[data-site-edit]")) return;
      state.onCancel();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [editingId]);

  const columns = useMemo(
    () =>
      siteColumns.columns([
        siteColumns.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          sortFn: "text",
          cell: ({ row }) => {
            const state = stateRef.current;
            const editing = state.editingId === row.original.jobSiteId;
            const busy = state.busyKey === row.original.jobSiteId;
            if (!editing) return <TableName>{row.original.name}</TableName>;
            return (
              <input
                id={`site-name-${row.original.jobSiteId}`}
                className="input-saas table-edit-input"
                data-site-edit=""
                aria-label="Name"
                value={state.editName}
                disabled={busy}
                onChange={(event) => state.onEditName(event.target.value)}
              />
            );
          },
        }),
        siteColumns.accessor((row) => row.address ?? "", {
          id: "address",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Address" />,
          sortFn: "text",
          cell: ({ row }) => {
            const state = stateRef.current;
            const editing = state.editingId === row.original.jobSiteId;
            const busy = state.busyKey === row.original.jobSiteId;
            if (!editing) {
              return row.original.address ? (
                <TableIconText icon={MapPin}>{row.original.address}</TableIconText>
              ) : (
                <TableMuted>No address</TableMuted>
              );
            }
            return (
              <input
                className="input-saas table-edit-input"
                data-site-edit=""
                aria-label={`Address for ${row.original.name}`}
                value={state.editAddress}
                placeholder="Optional"
                disabled={busy}
                onChange={(event) => state.onEditAddress(event.target.value)}
              />
            );
          },
        }),
        siteColumns.accessor((row) => row.workers.map((worker) => worker.name).join(", "), {
          id: "workers",
          header: () => <span className="table-sort">Assigned Workers</span>,
          enableSorting: false,
          cell: ({ row }) => <SiteWorkers siteName={row.original.name} workers={row.original.workers} />,
        }),
        siteColumns.display({
          id: "actions",
          header: () => <span className="table-sort">Actions</span>,
          enableSorting: false,
          enableGlobalFilter: false,
          cell: ({ row }) => {
            const state = stateRef.current;
            const editing = state.editingId === row.original.jobSiteId;
            const busy = state.busyKey === row.original.jobSiteId;
            if (editing) {
              return (
                <div className="row-actions" data-site-edit="">
                  <button type="button" className="row-action" disabled={busy} onClick={() => state.onSave(row.original.jobSiteId)}>
                    {busy ? "Saving…" : "Save"}
                  </button>
                  <button type="button" className="row-action" disabled={busy} onClick={state.onCancel}>
                    Cancel
                  </button>
                </div>
              );
            }
            return (
              <div className="row-actions">
                <button
                  type="button"
                  className="row-action"
                  disabled={busy}
                  onClick={() => state.onStartEdit(row.original.jobSiteId, row.original.name, row.original.address)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="row-action row-action-danger"
                  disabled={busy}
                  onClick={() => state.onRemove(row.original.jobSiteId, row.original.name)}
                >
                  {busy ? "Removing…" : "Remove"}
                </button>
              </div>
            );
          },
        }),
      ]),
    [],
  );

  return (
    <AppDataTable
      key={query}
      columns={columns}
      data={rows}
      searchPlaceholder="Search by name or address…"
      initialSearch={query}
      empty={{
        title: "No job sites yet",
        description: "Job sites you add will appear here.",
      }}
    />
  );
}

// Shows the job site page for the signed-in admin's company.
export function JobSitesPage({ query = "" }: { query?: string }) {
  return <JobSitesPanel query={query} />;
}
