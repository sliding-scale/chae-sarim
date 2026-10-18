"use client";

import { JobSiteArt } from "@/components/dashboard/AdminArt";
import { AppDataTable, DataTableColumnHeader, TableIconText, TableMuted, TableStatus } from "@/components/lists/AppDataTable";
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
import { FormEvent, useMemo, useRef, useState } from "react";

// Reads a user-facing message from a Convex error.
function errorText(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return fallback;
}

// Lets an admin add, edit, and remove job sites for their company.
export function JobSitesPanel() {
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
      <section className="admin-hero is-site">
        <div className="admin-hero-head">
          <span className="admin-hero-icon">
            <MapPinPlus aria-hidden="true" />
          </span>
          <div>
            <h2 className="panel-title">Add a job site</h2>
            <p className="panel-copy">Where workers at {company} record time.</p>
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

// Shows a job site as coloured initials beside its name.
function SiteName({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="table-person">
      <span className="site-initials">{initials || "?"}</span>
      <span className="table-person-name">{name}</span>
    </span>
  );
}

// Renders job sites with inline editing and remove actions.
function SiteTable({
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
            if (!editing) return <SiteName name={row.original.name} />;
            return (
              <input
                id={`site-name-${row.original.jobSiteId}`}
                className="input-saas table-edit-input"
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
          header: "Assigned workers",
          enableSorting: false,
          cell: ({ row }) => {
            const people = row.original.workers;
            if (people.length === 0) return <TableMuted>None assigned</TableMuted>;
            const shown = people.slice(0, 4);
            const extra = people.length - shown.length;
            return (
              <span className="admin-faces">
                {shown.map((worker, index) => (
                  <UserAvatar key={`${worker.name}-${index}`} name={worker.name} />
                ))}
                {extra > 0 ? <span className="admin-faces-more">+{extra}</span> : null}
              </span>
            );
          },
        }),
        siteColumns.display({
          id: "status",
          header: "Status",
          enableSorting: false,
          cell: () => <TableStatus label="Active" tone="success" />,
        }),
        siteColumns.display({
          id: "actions",
          header: "Actions",
          enableSorting: false,
          enableGlobalFilter: false,
          cell: ({ row }) => {
            const state = stateRef.current;
            const editing = state.editingId === row.original.jobSiteId;
            const busy = state.busyKey === row.original.jobSiteId;
            if (editing) {
              return (
                <div className="row-actions">
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
      columns={columns}
      data={rows}
      searchPlaceholder="Filter by name or address..."
      empty={{
        title: "No job sites yet",
        description: "Job sites you add will appear here.",
      }}
    />
  );
}

// Shows the job site page for the signed-in admin's company.
export function JobSitesPage() {
  return <JobSitesPanel />;
}
