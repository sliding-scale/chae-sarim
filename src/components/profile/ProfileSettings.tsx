"use client";

import { ContentHeading } from "@/components/dashboard/ContentHeading";
import { useWorkspace } from "@/components/layout/RoleGate";
import { CompanySettings } from "@/components/profile/CompanySettings";
import { UserAvatar } from "@/components/users/UserAvatar";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { ConvexError } from "convex/values";
import { useMutation } from "convex/react";
import { FormEvent, useEffect, useState } from "react";

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

// Lets the signed-in person update their photo and name.
export function ProfileSettings() {
  const workspace = useWorkspace();
  const { isLoaded, user } = useUser();
  const updateProfileName = useMutation(api.users.mutations.updateProfileName);
  const generateUploadUrl = useMutation(api.users.mutations.generateProfileImageUploadUrl);
  const setProfileImage = useMutation(api.users.mutations.setProfileImage);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
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
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const imageUrl = preview || (cleared ? null : workspace.imageUrl || (user?.hasImage ? user.imageUrl : null));
  const email = user?.primaryEmailAddress?.emailAddress || workspace.email;

  // Uploads a chosen profile photo and returns its storage id.
  async function uploadPhoto(photo: File) {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": photo.type || "application/octet-stream" },
      body: photo,
    });
    const body = (await response.json()) as { storageId?: Id<"_storage"> };
    if (!response.ok || !body.storageId) throw new Error("Could not upload that photo.");
    return body.storageId;
  }

  // Saves the photo on the Convex user and the name in Clerk and Convex.
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
      if (file) {
        await setProfileImage({ imageStorageId: await uploadPhoto(file) });
        await user.setProfileImage({ file });
      } else if (cleared) {
        await setProfileImage({ imageStorageId: null });
        if (user.hasImage) await user.setProfileImage({ file: null });
      }
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
      <ContentHeading title="Profile" description="Update how your name and photo appear in the dashboard." />
      <section className="profile-section" aria-labelledby="personal-profile-heading">
        <header className="profile-section-heading">
          <h2 id="personal-profile-heading" className="profile-section-title">
            Personal profile
          </h2>
        </header>

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
              accept="image/png,image/jpeg,image/webp"
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
      </section>

      {workspace.role === "admin" ? (
        <section className="profile-section" aria-labelledby="company-profile-heading">
          <header className="profile-section-heading">
            <h2 id="company-profile-heading" className="profile-section-title">
              Company profile
            </h2>
            <p className="page-description">
              Update the photo, name, and contact details workers see for this company.
            </p>
          </header>
          <CompanySettings />
        </section>
      ) : null}
    </div>
  );
}
