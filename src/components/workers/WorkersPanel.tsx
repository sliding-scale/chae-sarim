"use client";

import { AppDataTable, DataTableColumnHeader, TableMuted, TablePerson, TableStatus, emailHandle } from "@/components/lists/AppDataTable";
import type { DataTableFeatures } from "@/components/lists/data-table-features";
import { useWorkspace } from "@/components/layout/RoleGate";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createColumnHelper } from "@tanstack/react-table";
import { ConvexError } from "convex/values";
import { useAction, useMutation, useQuery } from "convex/react";
import { FormEvent, useMemo, useState } from "react";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reads a user-facing message from a Convex error.
function errorText(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// Lets an admin invite, cancel invites, and remove workers in their company.
export function WorkersPanel() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "this company";
  const workers = useQuery(api.memberships.queries.listWorkers);
  const invites = useQuery(api.invites.queries.listPending);
  const sites = useQuery(api.jobSites.queries.listJobSites);
  const removeWorker = useMutation(api.memberships.mutations.removeWorker);
  const setWorkerJobSites = useMutation(api.memberships.mutations.setWorkerJobSites);
  const inviteWorker = useAction(api.invites.actions.inviteWorker);
  const revokeInvite = useAction(api.invites.actions.revokeInvite);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<{
    membershipId: Id<"memberships">;
    name: string;
    selected: Id<"jobSites">[];
  } | null>(null);
  const confirm = useConfirm();

  // Sends a worker invite for the email in the form.
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = email.trim().toLowerCase();
    if (!emailPattern.test(next)) {
      setError("Enter a valid email address.");
      return;
    }

    setBusyKey("invite");
    setError("");
    setNotice("");
    try {
      await inviteWorker({ email: next, origin: window.location.origin });
      setEmail("");
      setNotice("Invite sent. They'll get an email with a link to join.");
    } catch (caught) {
      setError(errorText(caught, "Could not invite that worker."));
    } finally {
      setBusyKey(null);
    }
  }

  // Cancels a pending invite after the admin confirms.
  async function onRevoke(target: string) {
    const { accepted } = await confirm({
      title: "Cancel invite",
      body: `Cancel the invite for ${target}?`,
      confirmLabel: "Cancel invite",
      tone: "danger",
    });
    if (!accepted) return;
    setBusyKey(`invite:${target}`);
    setError("");
    setNotice("");
    try {
      await revokeInvite({ email: target });
    } catch (caught) {
      setError(errorText(caught, "Could not cancel that invite."));
    } finally {
      setBusyKey(null);
    }
  }

  // Removes a joined worker after the admin confirms.
  async function onRemove(membershipId: Id<"memberships">, name: string) {
    const { accepted } = await confirm({
      title: "Remove worker",
      body: `Remove ${name} from ${company}? They will lose access to this company.`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!accepted) return;
    setBusyKey(membershipId);
    setError("");
    setNotice("");
    try {
      await removeWorker({ membershipId });
    } catch (caught) {
      setError(errorText(caught, "Could not remove that worker."));
    } finally {
      setBusyKey(null);
    }
  }

  // Saves the job sites checked for one worker.
  async function onSaveSites(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigning) return;
    setBusyKey(assigning.membershipId);
    setError("");
    try {
      await setWorkerJobSites({ membershipId: assigning.membershipId, jobSiteIds: assigning.selected });
      setAssigning(null);
    } catch (caught) {
      setError(errorText(caught, "Could not update those job sites."));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <section className="saas-card invite-panel">
        <h2 className="panel-title">Invite a worker</h2>
        <p className="panel-copy">
          Send an invite to join {company} as a worker. They get an email with a link to choose a password and
          join.
        </p>
        <form className="invite-form" onSubmit={onSubmit} noValidate>
          <div>
            <label className="form-label" htmlFor="worker-email">
              Email
              <RequiredMark />
            </label>
            <input
              id="worker-email"
              className="input-saas"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="worker@company.com"
              value={email}
              disabled={busyKey === "invite"}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "worker-email-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError("");
                if (notice) setNotice("");
              }}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={busyKey === "invite"}>
            {busyKey === "invite" ? "Inviting…" : "Invite worker"}
          </button>
          {error ? (
            <p id="worker-email-error" className="field-error">
              {error}
            </p>
          ) : null}
          {notice ? <p className="form-success">{notice}</p> : null}
        </form>
        <p className="invite-note">Role is worker. This invite is only for {company}.</p>
      </section>

      <section className="saas-card stack-card">
        <h2 className="panel-title">Workers</h2>
        <p className="panel-copy">
          People who have joined {company}. Assign the job sites each person can use. Removing someone takes
          away their access. Their timesheets, invoices, and holiday requests stay with the company.
        </p>
        {workers === undefined ? (
          <p className="invite-note">Loading workers…</p>
        ) : (
          <WorkerTable
            rows={workers}
            busyKey={busyKey}
            onAssign={(worker) =>
              setAssigning({
                membershipId: worker.membershipId,
                name: worker.name,
                selected: worker.jobSites.map((site) => site.jobSiteId),
              })
            }
            onRemove={onRemove}
          />
        )}
      </section>

      <section className="saas-card stack-card">
        <h2 className="panel-title">Pending invites</h2>
        {invites === undefined ? (
          <p className="invite-note">Loading invites…</p>
        ) : (
          <InviteTable rows={invites} busyKey={busyKey} onRevoke={onRevoke} />
        )}
      </section>
      {assigning ? (
        <div
          className="confirm-backdrop"
          onMouseDown={() => {
            setAssigning(null);
            setError("");
          }}
        >
          <form
            className="saas-card confirm-dialog assign-dialog"
            onSubmit={onSaveSites}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 className="panel-title">Job sites for {assigning.name}</h2>
            <p className="panel-copy">Choose the sites this worker can use for timesheets, invoices, and holidays.</p>
            {sites === undefined ? (
              <p className="invite-note">Loading job sites…</p>
            ) : sites.length === 0 ? (
              <p className="invite-note">Add a job site before you can assign one.</p>
            ) : (
              <div className="site-checks">
                {sites.map((site) => {
                  const checked = assigning.selected.includes(site.jobSiteId);
                  return (
                    <label key={site.jobSiteId} className="check-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setAssigning({
                            ...assigning,
                            selected: checked
                              ? assigning.selected.filter((id) => id !== site.jobSiteId)
                              : [...assigning.selected, site.jobSiteId],
                          })
                        }
                      />
                      <span>{site.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {error ? <p className="field-error">{error}</p> : null}
            <div className="confirm-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setAssigning(null);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button className="btn-primary" type="submit" disabled={busyKey === assigning.membershipId || !sites?.length}>
                {busyKey === assigning.membershipId ? "Saving…" : "Save sites"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

type WorkerRow = {
  membershipId: Id<"memberships">;
  name: string;
  email: string;
  jobSites: { jobSiteId: Id<"jobSites">; name: string }[];
};

const workerColumns = createColumnHelper<DataTableFeatures, WorkerRow>();

// Renders the company worker list with assign and remove actions.
function WorkerTable({
  rows,
  busyKey,
  onAssign,
  onRemove,
}: {
  rows: WorkerRow[];
  busyKey: string | null;
  onAssign: (worker: WorkerRow) => void;
  onRemove: (membershipId: Id<"memberships">, name: string) => void;
}) {
  const columns = useMemo(
    () =>
      workerColumns.columns([
        workerColumns.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }) => (
            <TablePerson name={row.original.name} detail={row.original.email ? emailHandle(row.original.email) : null} active />
          ),
          sortFn: "text",
        }),
        workerColumns.accessor("email", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
          cell: ({ row }) => <TableMuted>{row.original.email || "No email on file"}</TableMuted>,
          sortFn: "text",
        }),
        workerColumns.accessor((row) => row.jobSites.map((site) => site.name).join(", "), {
          id: "jobSites",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job sites" />,
          cell: ({ row }) => (
            <TableMuted>
              {row.original.jobSites.length > 0 ? row.original.jobSites.map((site) => site.name).join(", ") : "None assigned"}
            </TableMuted>
          ),
          sortFn: "text",
        }),
        workerColumns.display({
          id: "status",
          header: "Status",
          enableSorting: false,
          cell: () => <TableStatus label="Active" />,
        }),
        workerColumns.display({
          id: "actions",
          enableSorting: false,
          enableGlobalFilter: false,
          cell: ({ row }) => {
            const busy = busyKey === row.original.membershipId;
            return (
              <div className="row-actions">
                <button type="button" className="row-action" onClick={() => onAssign(row.original)}>
                  Assign
                </button>
                <button
                  type="button"
                  className="row-action row-action-danger"
                  disabled={busy}
                  onClick={() => onRemove(row.original.membershipId, row.original.name)}
                >
                  {busy ? "Removing…" : "Remove"}
                </button>
              </div>
            );
          },
        }),
      ]),
    [busyKey, onAssign, onRemove],
  );

  return (
    <AppDataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Filter by name or email..."
      filters={[{ id: "status", label: "Status", value: () => "Active" }]}
    />
  );
}

type InviteRow = { email: string };

const inviteColumns = createColumnHelper<DataTableFeatures, InviteRow>();

// Renders pending worker invites with a remove action.
function InviteTable({
  rows,
  busyKey,
  onRevoke,
}: {
  rows: InviteRow[];
  busyKey: string | null;
  onRevoke: (email: string) => void;
}) {
  const columns = useMemo(
    () =>
      inviteColumns.columns([
        inviteColumns.accessor("email", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
          cell: ({ row }) => <TablePerson name={row.original.email} detail={emailHandle(row.original.email)} />,
          sortFn: "text",
        }),
        inviteColumns.display({
          id: "role",
          header: "Role",
          enableSorting: false,
          cell: () => <TableMuted>Worker</TableMuted>,
        }),
        inviteColumns.display({
          id: "status",
          header: "Status",
          enableSorting: false,
          cell: () => <TableStatus label="Pending" />,
        }),
        inviteColumns.display({
          id: "actions",
          enableSorting: false,
          enableGlobalFilter: false,
          cell: ({ row }) => {
            const busy = busyKey === `invite:${row.original.email}`;
            return (
              <button type="button" className="row-action row-action-danger" disabled={busy} onClick={() => onRevoke(row.original.email)}>
                {busy ? "Removing…" : "Remove"}
              </button>
            );
          },
        }),
      ]),
    [busyKey, onRevoke],
  );

  return (
    <AppDataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Filter by email..."
      filters={[{ id: "status", label: "Status", value: () => "Pending" }]}
    />
  );
}

// Shows the workers page for the signed-in admin's company.
export function WorkersPage() {
  return <WorkersPanel />;
}
