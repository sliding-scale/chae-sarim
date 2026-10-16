"use client";

import { RequiredMark } from "@/components/ui/RequiredMark";
import { useUser } from "@clerk/nextjs";
import { FormEvent, useState } from "react";

// Asks an invited worker to replace the temporary password before using the dashboard.
export function ChangePassword() {
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Replaces the temporary password and clears the required-change flag.
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newPassword) {
      setError("Enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password that is different from the temporary one.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error || "Could not change your password.");
        return;
      }
      await user?.reload();
      window.location.assign("/dashboard");
    } catch {
      setError("Could not change your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="saas-card panel profile-card" onSubmit={onSubmit}>
      <h2 className="panel-title">Choose a new password</h2>
      <p className="panel-copy">
        This account was created with a temporary password. Enter that password, then choose one you will use
        from now on.
      </p>
      <div className="field">
        <label className="form-label" htmlFor="current-password">
          Temporary password
          <RequiredMark />
        </label>
        <input
          id="current-password"
          className="input-saas"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          disabled={busy}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </div>
      <div className="field">
        <label className="form-label" htmlFor="new-password">
          New password
          <RequiredMark />
        </label>
        <input
          id="new-password"
          className="input-saas"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          disabled={busy}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </div>
      <div className="field">
        <label className="form-label" htmlFor="confirm-password">
          Confirm new password
          <RequiredMark />
        </label>
        <input
          id="confirm-password"
          className="input-saas"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          disabled={busy}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
