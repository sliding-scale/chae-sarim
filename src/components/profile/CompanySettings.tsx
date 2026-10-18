"use client";

import { CompanyMark } from "@/components/brand/CompanyMark";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useState } from "react";

// Reads a user-facing message from a Convex error.
function errorText(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  if (error instanceof Error && error.message) return error.message;
  return "Could not save the company.";
}

// Lets an admin edit the company photo, name, and contact details.
export function CompanySettings() {
  const company = useQuery(api.tenants.queries.getCompany);
  const updateCompany = useMutation(api.tenants.mutations.updateCompany);
  const generateUploadUrl = useMutation(api.tenants.mutations.generateCompanyImageUploadUrl);
  const setCompanyImage = useMutation(api.tenants.mutations.setCompanyImage);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!company || seeded) return;
    setName(company.name);
    setAddress(company.address ?? "");
    setPhone(company.phone ?? "");
    setContactEmail(company.contactEmail ?? "");
    setSeeded(true);
  }, [company, seeded]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (cleared && company && !company.imageUrl) setCleared(false);
  }, [cleared, company]);

  const imageUrl = preview || (cleared || !company?.imageUrl ? null : company.imageUrl);

  // Uploads a chosen company photo and returns its storage id.
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

  // Saves the company photo and details for the signed-in admin.
  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (file) await setCompanyImage({ imageStorageId: await uploadPhoto(file) });
      else if (cleared) await setCompanyImage({ imageStorageId: null });
      await updateCompany({ name, address, phone, contactEmail });
      setFile(null);
      setPreview(null);
      setSaved(true);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="saas-card panel profile-card" onSubmit={onSave}>
      {company === undefined ? (
        <p className="invite-note">Loading company details…</p>
      ) : (
        <>
          <div className="profile-photo-row">
            <span className="company-mark" aria-hidden="true">
              <CompanyMark imageUrl={imageUrl} size={28} />
            </span>
            <div>
              <label className="btn-secondary" htmlFor="company-photo">
                Choose photo
              </label>
              <input
                id="company-photo"
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
          <div className="field">
            <label className="form-label" htmlFor="company-name">
              Company name
              <RequiredMark />
            </label>
            <input
              id="company-name"
              className="input-saas"
              value={name}
              disabled={busy}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="field">
            <label className="form-label" htmlFor="company-address">
              Address
            </label>
            <input
              id="company-address"
              className="input-saas"
              value={address}
              disabled={busy}
              onChange={(event) => {
                setAddress(event.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="profile-fields">
            <div className="field">
              <label className="form-label" htmlFor="company-phone">
                Phone
              </label>
              <input
                id="company-phone"
                className="input-saas"
                value={phone}
                autoComplete="tel"
                disabled={busy}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setSaved(false);
                }}
              />
            </div>
            <div className="field">
              <label className="form-label" htmlFor="company-email">
                Contact email
              </label>
              <input
                id="company-email"
                className="input-saas"
                type="email"
                value={contactEmail}
                autoComplete="email"
                disabled={busy}
                onChange={(event) => {
                  setContactEmail(event.target.value);
                  setSaved(false);
                }}
              />
            </div>
          </div>
          {error ? <p className="field-error">{error}</p> : null}
          {saved ? <p className="form-success">Company saved.</p> : null}
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save company"}
          </button>
        </>
      )}
    </form>
  );
}
