"use client";

import { InviteArt } from "@/components/dashboard/AdminArt";
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
import { Info, Mail, Send, UserRoundPlus } from "lucide-react";
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
      <section className="admin-hero is-invite">
        <div className="admin-hero-head">
          <span className="admin-hero-icon">
            <UserRoundPlus aria-hidden="true" />
          </span>
          <div>
            <h2 className="panel-title">Invite a worker</h2>
            <p className="panel-copy">
              Send an invite to join {company} as a worker. They get an email with a link to choose a password and
              join.
            </p>
          </div>
        </div>
        <form className="invite-form" onSubmit={onSubmit} noValidate>
          <div>
            <label className="form-label" htmlFor="worker-email">
              Email
              <RequiredMark />
            </label>
            <span className="admin-input">
              <Mail aria-hidden="true" />
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
            </span>
          </div>
          <button className="btn-primary" type="submit" disabled={busyKey === "invite"}>
            <Send size={16} aria-hidden="true" />
            {busyKey === "invite" ? "Inviting…" : "Invite worker"}
          </button>
          {error ? (
            <p id="worker-email-error" className="field-error">
              {error}
            </p>
          ) : null}
          {notice ? <p className="form-success">{notice}</p> : null}
        </form>
        <p className="admin-helper">
          <Info size={16} aria-hidden="true" />
          Role is worker. This invite is only for {company}.
        </p>
        <InviteArt />
      </section>

      <section className="admin-table-card">
        <h2 className="panel-title">Workers</h2>
        <p className="panel-copy">Joined workers and pending invites for {company}.</p>
        {workers === undefined || invites === undefined ? (
          <p className="invite-note">Loading workers…</p>
        ) : (
          <WorkerTable
            rows={[
              ...workers.map((worker) => ({ kind: "worker" as const, ...worker })),
              ...invites.map((invite) => ({ kind: "invite" as const, email: invite.email })),
            ]}
            busyKey={busyKey}
            onAssign={(worker) =>
              setAssigning({
                membershipId: worker.membershipId,
                name: worker.name,
                selected: worker.jobSites.map((site) => site.jobSiteId),
              })
            }
            onRemove={onRemove}
            onRevoke={onRevoke}
          />
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

type RosterRow =
  | ({ kind: "worker" } & WorkerRow)
  | { kind: "invite"; email: string };

const pillTones = ["blue", "green", "purple"] as const;

// Shows a worker's assigned sites as short coloured labels.
function SitePills({ names }: { names: string[] }) {
  if (names.length === 0) return <span className="table-muted">None assigned</span>;
  const shown = names.slice(0, 2);
  const extra = names.length - shown.length;
  return (
    <span className="admin-pills">
      {shown.map((name, index) => (
        <span key={name} className={`admin-pill is-${pillTones[index % pillTones.length]}`}>
          {name}
        </span>
      ))}
      {extra > 0 ? <span className="admin-pill is-more">+{extra}</span> : null}
    </span>
  );
}

const rosterColumns = createColumnHelper<DataTableFeatures, RosterRow>();

// Renders joined workers and pending invites in the one table from the workers design.
function WorkerTable({
  rows,
  busyKey,
  onAssign,
  onRemove,
  onRevoke,
}: {
  rows: RosterRow[];
  busyKey: string | null;
  onAssign: (worker: WorkerRow) => void;
  onRemove: (membershipId: Id<"memberships">, name: string) => void;
  onRevoke: (email: string) => void;
}) {
  const columns = useMemo(
    () =>
      rosterColumns.columns([
        rosterColumns.accessor((row) => (row.kind === "worker" ? `${row.name} ${row.email}` : row.email), {
          id: "name",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }) => {
            const email = row.original.email;
            const name = row.original.kind === "worker" ? row.original.name : email.split("@")[0] || email;
            return <TablePerson name={name} detail={email ? emailHandle(email) : null} active={row.original.kind === "worker"} />;
          },
          sortFn: "text",
        }),
        rosterColumns.accessor("email", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
          cell: ({ row }) => <TableMuted>{row.original.email || "No email on file"}</TableMuted>,
          sortFn: "text",
        }),
        rosterColumns.accessor((row) => (row.kind === "worker" ? row.jobSites.map((site) => site.name).join(", ") : ""), {
          id: "jobSites",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job sites" />,
          cell: ({ row }) =>
            row.original.kind === "worker" ? (
              <SitePills names={row.original.jobSites.map((site) => site.name)} />
            ) : (
              <span className="table-muted">None assigned</span>
            ),
          sortFn: "text",
        }),
        rosterColumns.accessor((row) => (row.kind === "worker" ? "Active" : "Pending Invite"), {
          id: "status",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => (
            <TableStatus
              label={row.original.kind === "worker" ? "Active" : "Pending Invite"}
              tone={row.original.kind === "worker" ? "success" : "warning"}
            />
          ),
          sortFn: "text",
        }),
        rosterColumns.display({
          id: "actions",
          header: "Actions",
          enableSorting: false,
          enableGlobalFilter: false,
          cell: ({ row }) => {
            if (row.original.kind === "invite") {
              const busy = busyKey === `invite:${row.original.email}`;
              return (
                <div className="row-actions">
                  <button type="button" className="row-action row-action-danger" disabled={busy} onClick={() => onRevoke(row.original.email)}>
                    {busy ? "Removing…" : "Remove"}
                  </button>
                </div>
              );
            }
            const worker = row.original;
            const busy = busyKey === worker.membershipId;
            return (
              <div className="row-actions">
                <button type="button" className="row-action" onClick={() => onAssign(worker)}>
                  Assign
                </button>
                <button
                  type="button"
                  className="row-action row-action-danger"
                  disabled={busy}
                  onClick={() => onRemove(worker.membershipId, worker.name)}
                >
                  {busy ? "Removing…" : "Remove"}
                </button>
              </div>
            );
          },
        }),
      ]),
    [busyKey, onAssign, onRemove, onRevoke],
  );

  return (
    <AppDataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search by name or email..."
      filters={[
        { id: "status", label: "Status", value: (row) => (row.kind === "worker" ? "Active" : "Pending Invite") },
        {
          id: "site",
          label: "Job site",
          value: () => "",
          values: (row) => (row.kind === "worker" ? row.jobSites.map((site) => site.name) : []),
        },
      ]}
      empty={{ title: "No workers yet", description: "Invited and joined workers will appear here." }}
    />
  );
}

// Shows the workers page for the signed-in admin's company.
export function WorkersPage() {
  return <WorkersPanel />;
}
