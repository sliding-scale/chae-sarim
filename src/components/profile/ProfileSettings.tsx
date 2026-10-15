"use client";

import { useWorkspace } from "@/components/layout/RoleGate";
import { UserAvatar } from "@/components/users/UserAvatar";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { ConvexError } from "convex/values";
import { useMutation } from "convex/react";
import { FormEvent, useEffect, useState } from "react";

type Theme = "light" | "dark";

// Reads a short message from a Clerk or Convex error.
function errorText(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  if (error && typeof error === "object" && "errors" in error) {
    const details = (error as { errors?: { longMessage?: string; message?: string }[] }).errors;
    const message = details?.[0]?.longMessage || details?.[0]?.message;
    if (message) return message;
  }
  return "Could not save your profile.";
}

// Lets the signed-in person update their photo, name, and color theme.
export function ProfileSettings() {
  const workspace = useWorkspace();
  const { isLoaded, user } = useUser();
  const updateProfileName = useMutation(api.users.mutations.updateProfileName);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || seeded) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setSeeded(true);
  }, [seeded, user]);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const imageUrl = preview || (cleared || !user?.hasImage ? null : user.imageUrl);
  const email = user?.primaryEmailAddress?.emailAddress || workspace.email;

  // Applies light or dark mode and remembers the choice on this browser.
  function chooseTheme(next: Theme) {
    document.documentElement.dataset.theme = next;
    localStorage.setItem("chae-theme", next);
    setTheme(next);
  }

  // Saves the photo and name to Clerk, then stores the display name in Convex.
  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const nextFirst = firstName.trim();
    const nextLast = lastName.trim();
    if (!nextFirst) {
      setError("Enter your first name.");
      setSaved(false);
      return;
    }

    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (file) await user.setProfileImage({ file });
      else if (cleared && user.hasImage) await user.setProfileImage({ file: null });
      await user.update({ firstName: nextFirst, lastName: nextLast });
      await updateProfileName({ name: [nextFirst, nextLast].filter(Boolean).join(" ") });
      setFile(null);
      setPreview(null);
      setCleared(false);
      setSaved(true);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-layout">
      <div>
        <h2 className="panel-title">Profile</h2>
        <p className="page-description">Update how your name and photo appear in the dashboard.</p>
      </div>

      <form className="saas-card panel profile-card" onSubmit={onSave}>
        <div className="profile-photo-row">
          <UserAvatar
            className="avatar-lg"
            name={[firstName, lastName].filter(Boolean).join(" ") || workspace.name}
            imageUrl={imageUrl}
          />
          <div>
            <label className="btn-secondary" htmlFor="profile-photo">
              Choose photo
            </label>
            <input
              id="profile-photo"
              className="visually-hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                if (next && next.size > 5 * 1024 * 1024) {
                  setError("Choose a photo smaller than 5 MB.");
                  event.target.value = "";
                  return;
                }
                setError("");
                setSaved(false);
                setFile(next);
                setCleared(false);
              }}
            />
            {imageUrl ? (
              <button
                type="button"
                className="btn-text"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setCleared(true);
                  setSaved(false);
                }}
              >
                Remove photo
              </button>
            ) : null}
          </div>
        </div>

        <div className="profile-fields">
          <div className="field">
            <label className="form-label" htmlFor="first-name">
              First name
              <RequiredMark />
            </label>
            <input
              id="first-name"
              className="input-saas"
              value={firstName}
              autoComplete="given-name"
              disabled={!isLoaded || busy}
              onChange={(event) => {
                setFirstName(event.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="field">
            <label className="form-label" htmlFor="last-name">
              Last name
            </label>
            <input
              id="last-name"
              className="input-saas"
              value={lastName}
              autoComplete="family-name"
              disabled={!isLoaded || busy}
              onChange={(event) => {
                setLastName(event.target.value);
                setSaved(false);
              }}
            />
          </div>
        </div>

        <div className="field">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input id="email" className="input-saas" value={email} disabled />
        </div>

        {error ? <p className="field-error">{error}</p> : null}
        {saved ? <p className="form-success">Profile saved.</p> : null}

        <button className="btn-primary" type="submit" disabled={!isLoaded || busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>

      <section className="saas-card panel profile-card">
        <h2 className="panel-title">Appearance</h2>
        <p className="page-description">Choose a theme for this browser.</p>
        <div className="theme-options" role="radiogroup" aria-label="Color theme">
          <button
            type="button"
            className={theme === "light" ? "theme-option is-selected" : "theme-option"}
            role="radio"
            aria-checked={theme === "light"}
            onClick={() => chooseTheme("light")}
          >
            Light
          </button>
          <button
            type="button"
            className={theme === "dark" ? "theme-option is-selected" : "theme-option"}
            role="radio"
            aria-checked={theme === "dark"}
            onClick={() => chooseTheme("dark")}
          >
            Dark
          </button>
        </div>
      </section>
    </div>
  );
}
