"use client";

import { useWorkspace } from "@/components/layout/RoleGate";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";

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
      <section className="saas-card invite-panel">
        <h2 className="panel-title">Add a job site</h2>
        <p className="panel-copy">Add a place where workers at {company} record time.</p>
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
      </section>

      <section className="saas-card stack-card">
        <h2 className="panel-title">Job sites</h2>
        <p className="panel-copy">Sites for {company}. A site that already has records cannot be removed.</p>
        {sites === undefined ? (
          <p className="invite-note">Loading job sites…</p>
        ) : sites.length === 0 ? (
          <div className="empty-panel">
            <h3 className="panel-title">No job sites yet</h3>
            <p className="panel-copy">Sites you add for this company will show up here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Address</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => {
                  const editing = editingId === site.jobSiteId;
                  const busy = busyKey === site.jobSiteId;
                  return (
                    <tr key={site.jobSiteId}>
                      <td>
                        {editing ? (
                          <label className="form-label" htmlFor={`site-name-${site.jobSiteId}`}>
                            Name
                            <RequiredMark />
                            <input
                              id={`site-name-${site.jobSiteId}`}
                              className="input-saas"
                              value={editName}
                              disabled={busy}
                              onChange={(event) => setEditName(event.target.value)}
                            />
                          </label>
                        ) : (
                          <strong>{site.name}</strong>
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <input
                            className="input-saas"
                            aria-label={`Address for ${site.name}`}
                            value={editAddress}
                            placeholder="Optional"
                            disabled={busy}
                            onChange={(event) => setEditAddress(event.target.value)}
                          />
                        ) : (
                          site.address || "No address"
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                className="row-action"
                                disabled={busy}
                                onClick={() => onSave(site.jobSiteId)}
                              >
                                {busy ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                className="row-action"
                                disabled={busy}
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="row-action"
                                disabled={busy}
                                onClick={() => startEdit(site.jobSiteId, site.name, site.address)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="row-action row-action-danger"
                                disabled={busy}
                                onClick={() => onRemove(site.jobSiteId, site.name)}
                              >
                                {busy ? "Removing…" : "Remove"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// Shows the job site page for the signed-in admin's company.
export function JobSitesPage() {
  const workspace = useWorkspace();
  const company = workspace.tenantName ?? "your company";

  return (
    <>
      <header className="page-header">
        <h2 className="page-title">Job sites</h2>
        <p className="page-description">Add, edit, or remove places where workers at {company} record time.</p>
      </header>
      <JobSitesPanel />
    </>
  );
}
