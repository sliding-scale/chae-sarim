"use client";

import { useWorkspace } from "@/components/layout/RoleGate";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reads a user-facing message from a Convex error.
function errorText(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return fallback;
}

// Lets an admin invite, cancel invites, and remove workers in their company.
export function WorkersPanel() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "this company";
  const workers = useQuery(api.memberships.queries.listWorkers);
  const invites = useQuery(api.invites.queries.listPending);
  const inviteWorker = useMutation(api.invites.mutations.inviteWorker);
  const revokeInvite = useMutation(api.invites.mutations.revokeInvite);
  const removeWorker = useMutation(api.memberships.mutations.removeWorker);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
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
    try {
      await inviteWorker({ email: next });
      setEmail("");
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
    try {
      await removeWorker({ membershipId });
    } catch (caught) {
      setError(errorText(caught, "Could not remove that worker."));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <section className="saas-card invite-panel">
        <h2 className="panel-title">Invite a worker</h2>
        <p className="panel-copy">
          Send an invite to join {company} as a worker. They use this email when they sign up.
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
        </form>
        <p className="invite-note">Role is worker. This invite is only for {company}.</p>
      </section>

      <section className="saas-card stack-card">
        <h2 className="panel-title">Workers</h2>
        <p className="panel-copy">
          People who have joined {company}. Removing someone takes away their access. Their timesheets,
          invoices, and holiday requests stay with the company.
        </p>
        {workers === undefined ? (
          <p className="invite-note">Loading workers…</p>
        ) : workers.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">No workers yet</h3>
            <p className="panel-copy">Workers appear here after they sign up with an invited email.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.membershipId}>
                    <td>
                      <strong>{worker.name}</strong>
                    </td>
                    <td>{worker.email || "No email on file"}</td>
                    <td>
                      <Badge tone="neutral">Worker</Badge>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="row-action row-action-danger"
                        disabled={busyKey === worker.membershipId}
                        onClick={() => onRemove(worker.membershipId, worker.name)}
                      >
                        {busyKey === worker.membershipId ? "Removing…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="saas-card stack-card">
        <h2 className="panel-title">Pending invites</h2>
        {invites === undefined ? (
          <p className="invite-note">Loading invites…</p>
        ) : invites.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">No pending invites</h3>
            <p className="panel-copy">Workers you invite will be listed here until they join.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.email}>
                    <td>
                      <strong>{invite.email}</strong>
                    </td>
                    <td>
                      <Badge tone="neutral">Worker</Badge>
                    </td>
                    <td>
                      <Badge tone="warning">Pending</Badge>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="row-action row-action-danger"
                        disabled={busyKey === `invite:${invite.email}`}
                        onClick={() => onRevoke(invite.email)}
                      >
                        {busyKey === `invite:${invite.email}` ? "Removing…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// Shows the workers page for the signed-in admin's company.
export function WorkersPage() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "your company";

  return (
    <>
      <header className="page-header">
        <h2 className="page-title">Workers</h2>
        <p className="page-description">Invite someone to work at {company}, or remove a worker who has joined.</p>
      </header>
      <WorkersPanel />
    </>
  );
}
