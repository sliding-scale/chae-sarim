"use client";

import { InviteArt } from "@/components/dashboard/AdminArt";
import { ContentHeading } from "@/components/dashboard/ContentHeading";
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
import { jobSiteSearchHref } from "@/lib/admin-search";
import { Info, Mail, Send, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reads a user-facing message from a Convex error.
function errorText(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// Lets an admin invite, cancel invites, and remove workers in their company.
export function WorkersPanel({ query = "" }: { query?: string }) {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "this company";
  const workers = useQuery(api.memberships.queries.listWorkers);
  const invites = useQuery(api.invites.queries.listPending);
  const sites = useQuery(api.jobSites.queries.listJobSites);
  const removeWorker = useMutation(api.memberships.mutations.removeWorker);
  const setWorkerJobSites = useMutation(api.memberships.mutations.setWorkerJobSites);
  const inviteWorker = useAction(api.invites.actions.inviteWorker);
  const resendInvite = useAction(api.invites.actions.resendInvite);
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

  // Emails the invite link again for a worker who has not joined.
  async function onResend(target: string) {
    const { accepted } = await confirm({
      title: "Resend invite",
      body: `Send the invite for ${target} again?`,
      confirmLabel: "Resend invite",
      tone: "primary",
    });
    if (!accepted) return;
    setBusyKey(`resend:${target}`);
    setError("");
    setNotice("");
    try {
      await resendInvite({ email: target, origin: window.location.origin });
      setNotice(`Invite sent again to ${target}.`);
    } catch (caught) {
      setError(errorText(caught, "Could not resend that invite."));
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
      <ContentHeading
        title="Workers"
        description="Invite people to the company and assign the job sites they work on."
      />
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
            query={query}
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
            onResend={onResend}
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
            <h2 className="panel-title">Assign job sites</h2>
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
                {busyKey === assigning.membershipId ? "Saving…" : "Save changes"}
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

const pillTones = ["green", "blue", "amber", "purple"] as const;

// Opens the job sites list already searched for this site.
function JobSitePill({ name }: { name: string }) {
  return (
    <Link href={jobSiteSearchHref(name)} className={`admin-pill is-${siteTone(name)}`} aria-label={`Search job sites for ${name}`}>
      {name}
    </Link>
  );
}

// Picks a stable pill colour from the site name so it does not change with list order.
function siteTone(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % pillTones.length;
  return pillTones[hash];
}

// Lists every job site assigned to one worker.
function WorkerSitesDialog({
  workerName,
  sites,
  onClose,
}: {
  workerName: string;
  sites: { jobSiteId: Id<"jobSites">; name: string }[];
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
          {workerName}
        </h2>
        <p className="panel-copy">
          {sites.length} job {sites.length === 1 ? "site" : "sites"} assigned to this worker.
        </p>
        <div className="admin-pills site-pill-list">
          {sites.map((site) => (
            <JobSitePill key={site.jobSiteId} name={site.name} />
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

// Shows a worker's assigned sites, and opens the full list when some are hidden.
function SitePills({
  workerName,
  sites,
}: {
  workerName: string;
  sites: { jobSiteId: Id<"jobSites">; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    moreRef.current?.focus();
  }, []);

  if (sites.length === 0) return <span className="table-muted">None assigned</span>;
  const shown = sites.slice(0, 2);
  const extra = sites.length - shown.length;
  return (
    <>
      <span className="admin-pills">
        {shown.map((site) => (
          <JobSitePill key={site.jobSiteId} name={site.name} />
        ))}
        {extra > 0 ? (
          <button
            ref={moreRef}
            type="button"
            className="admin-pill is-more"
            aria-haspopup="dialog"
            aria-label={`View all ${sites.length} job sites for ${workerName}`}
            onClick={() => setOpen(true)}
          >
            +{extra}
          </button>
        ) : null}
      </span>
      {open ? <WorkerSitesDialog workerName={workerName} sites={sites} onClose={close} /> : null}
    </>
  );
}

const rosterColumns = createColumnHelper<DataTableFeatures, RosterRow>();

// Renders joined workers and pending invites in the one table from the workers design.
function WorkerTable({
  rows,
  query,
  busyKey,
  onAssign,
  onRemove,
  onRevoke,
  onResend,
}: {
  rows: RosterRow[];
  query: string;
  busyKey: string | null;
  onAssign: (worker: WorkerRow) => void;
  onRemove: (membershipId: Id<"memberships">, name: string) => void;
  onRevoke: (email: string) => void;
  onResend: (email: string) => void;
}) {
  const columns = useMemo(
    () =>
      rosterColumns.columns([
        rosterColumns.accessor((row) => (row.kind === "worker" ? `${row.name} ${row.email}` : row.email), {
          id: "name",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }) => {
            const email = row.original.email;
            if (row.original.kind === "invite") {
              return <TablePerson name={email.split("@")[0] || email} />;
            }
            return <TablePerson name={row.original.name} detail={email ? emailHandle(email) : null} />;
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
              <SitePills workerName={row.original.name} sites={row.original.jobSites} />
            ) : (
              <span className="table-muted">None assigned</span>
            ),
          sortFn: "text",
        }),
        rosterColumns.accessor((row) => (row.kind === "worker" ? "Joined" : "Pending invite"), {
          id: "status",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => (
            <TableStatus
              label={row.original.kind === "worker" ? "Joined" : "Pending invite"}
              tone={row.original.kind === "worker" ? "success" : "warning"}
              marker="dot"
            />
          ),
          sortFn: "text",
        }),
        rosterColumns.display({
          id: "actions",
          header: () => <span className="table-sort">Actions</span>,
          enableSorting: false,
          enableGlobalFilter: false,
          cell: ({ row }) => {
            if (row.original.kind === "invite") {
              const busy = busyKey === `invite:${row.original.email}` || busyKey === `resend:${row.original.email}`;
              return (
                <div className="row-actions">
                  <button type="button" className="row-action" disabled={busy} onClick={() => onResend(row.original.email)}>
                    {busyKey === `resend:${row.original.email}` ? "Sending…" : "Resend invite"}
                  </button>
                  <button type="button" className="row-action row-action-danger" disabled={busy} onClick={() => onRevoke(row.original.email)}>
                    {busyKey === `invite:${row.original.email}` ? "Cancelling…" : "Cancel invite"}
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
    [busyKey, onAssign, onRemove, onResend, onRevoke],
  );

  return (
    <AppDataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search by name or email…"
      initialSearch={query}
      filters={[
        { id: "status", label: "Status", value: (row) => (row.kind === "worker" ? "Joined" : "Pending invite") },
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
export function WorkersPage({ query = "" }: { query?: string }) {
  return <WorkersPanel query={query} />;
}
