import { ConvexError, v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";

type DayHours = Doc<"timesheets">["hours"];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Trims and lowercases an email, and rejects a value that is not an email address.
export function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!emailPattern.test(normalized)) {
    throw new ConvexError("Enter a valid email address.");
  }
  return normalized;
}

// Creates the Convex user for a Clerk account, then matches an invite or opens a company.
export async function syncClerkUser(
  ctx: MutationCtx,
  args: { clerkId: string; email: string; name: string },
) {
  const email = args.email.trim().toLowerCase();
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, { email, name: args.name });
  } else {
    await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email,
      name: args.name,
    });
  }

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
    .unique();
  if (membership) return;

  const invite = email
    ? await ctx.db
        .query("invites")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique()
    : null;
  if (invite) {
    const membershipId = await ctx.db.insert("memberships", {
      clerkId: args.clerkId,
      tenantId: invite.tenantId,
      role: "worker",
    });
    await ctx.db.delete(invite._id);
    await notifyAdminsOfJoin(ctx, invite.tenantId, args.clerkId, membershipId);
    return;
  }

  const tenantId = await ctx.db.insert("tenants", {
    name: `${args.name}'s company`,
  });
  await ctx.db.insert("memberships", {
    clerkId: args.clerkId,
    tenantId,
    role: "admin",
  });
}

// Saves the signed-in person's display name on their Convex user.
export async function renameSignedInUser(ctx: MutationCtx, name: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("You need to sign in.");

  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) throw new ConvexError("Enter your name.");
  if (trimmed.length > 80) throw new ConvexError("Name must be 80 characters or fewer.");

  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!existing) throw new ConvexError("Your account is still being created.");

  await ctx.db.patch(existing._id, { name: trimmed });
}

// Returns the signed-in admin's membership, or rejects the call.
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"memberships">> {
  const identity = await ctx.auth.getUserIdentity();
  const clerkId = identity?.subject;
  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();

  if (!membership || membership.role !== "admin") {
    throw new Error("Forbidden");
  }

  return membership;
}

// Returns the signed-in worker's membership, or rejects the call.
export async function requireWorker(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"memberships">> {
  const identity = await ctx.auth.getUserIdentity();
  const clerkId = identity?.subject;
  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();

  if (!membership || membership.role !== "worker") {
    throw new Error("Forbidden");
  }

  return membership;
}

const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export const hoursValidator = v.object({
  monday: v.number(),
  tuesday: v.number(),
  wednesday: v.number(),
  thursday: v.number(),
  friday: v.number(),
  saturday: v.number(),
  sunday: v.number(),
});

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const monthPattern = /^(\d{4})-(\d{2})$/;
const weekLimitMs = 7 * 24 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

// Checks a YYYY-MM month and returns its first and last calendar days.
export function monthWindow(month: string) {
  const match = monthPattern.exec(month);
  if (!match) throw new ConvexError("Choose a month.");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  if (monthIndex < 1 || monthIndex > 12) throw new ConvexError("Choose a month.");
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return {
    month,
    monthStart: `${month}-01`,
    monthEnd: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

// Checks the caller's local week and month before a dashboard summary uses them.
export function homeWindow(weekStartMs: number, weekEndMs: number, month: string) {
  const span = weekEndMs - weekStartMs;
  if (!Number.isFinite(weekStartMs) || !Number.isFinite(weekEndMs) || span < 6 * dayMs || span > 8 * dayMs) {
    throw new ConvexError("Choose a week.");
  }
  return { weekStartMs, weekEndMs, ...monthWindow(month) };
}

// Counts inclusive days that a date range shares with a month.
export function daysInsideMonth(startDate: string, endDate: string, monthStart: string, monthEnd: string) {
  const from = startDate > monthStart ? startDate : monthStart;
  const to = endDate < monthEnd ? endDate : monthEnd;
  if (from > to) return 0;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / dayMs) + 1;
}

// Checks that a week starts on Monday and has not started more than a week ahead.
export function weekRange(weekStart: string) {
  const match = datePattern.exec(weekStart);
  if (!match) throw new ConvexError("Choose a week.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = new Date(Date.UTC(year, month - 1, day));
  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day ||
    start.getUTCDay() !== 1
  ) {
    throw new ConvexError("Choose a week that starts on Monday.");
  }

  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (start.getTime() > todayUtc + weekLimitMs) {
    throw new ConvexError("That week has not started yet.");
  }

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const weekEnd = end.toISOString().slice(0, 10);
  return { weekStart, weekEnd };
}

// Keeps each day between 0 and 24 hours, to two decimal places.
export function dayHours(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 24) {
    throw new ConvexError("Enter between 0 and 24 hours for each day.");
  }
  return Math.round(value * 100) / 100;
}

// Checks every day on a timesheet and returns the stored hours.
export function timesheetHours(hours: DayHours) {
  const stored = {
    monday: dayHours(hours.monday),
    tuesday: dayHours(hours.tuesday),
    wednesday: dayHours(hours.wednesday),
    thursday: dayHours(hours.thursday),
    friday: dayHours(hours.friday),
    saturday: dayHours(hours.saturday),
    sunday: dayHours(hours.sunday),
  };
  if (dayKeys.every((day) => stored[day] === 0)) {
    throw new ConvexError("Enter the hours you worked this week.");
  }
  return stored;
}

// Trims a timesheet comment and rejects one that is too long.
export function timesheetComments(value: string | undefined) {
  const comments = value?.trim() ?? "";
  if (comments.length > 500) throw new ConvexError("Comments must be 500 characters or fewer.");
  return comments;
}

// Returns an optional rejection note, or rejects one that is too long.
export function rejectionReason(value: string | undefined) {
  const reason = value?.trim() ?? "";
  if (reason.length > 500) throw new ConvexError("Reason must be 500 characters or fewer.");
  return reason;
}

// Returns a job site that belongs to the company, or rejects the call.
export async function requireJobSite(
  ctx: QueryCtx | MutationCtx,
  tenantId: Id<"tenants">,
  jobSiteId: Id<"jobSites">,
) {
  const site = await ctx.db.get(jobSiteId);
  if (!site || site.tenantId !== tenantId) {
    throw new ConvexError("Choose a job site in your company.");
  }
  return site;
}

const assignmentLookupLimit = 20;

// Returns a job site assigned to this worker, or rejects the call.
export async function requireAssignedJobSite(
  ctx: QueryCtx | MutationCtx,
  tenantId: Id<"tenants">,
  clerkId: string,
  jobSiteId: Id<"jobSites">,
) {
  const site = await requireJobSite(ctx, tenantId, jobSiteId);
  const matches = await ctx.db
    .query("jobSiteAssignments")
    .withIndex("by_clerk_id_and_job_site_id", (q) =>
      q.eq("clerkId", clerkId).eq("jobSiteId", jobSiteId),
    )
    .take(assignmentLookupLimit);
  if (!matches.some((row) => row.tenantId === tenantId)) {
    throw new ConvexError("That job site is not assigned to you.");
  }
  return site;
}

const assignmentPageLimit = 100;

// Removes every job site assignment for one worker in a company.
export async function deleteWorkerAssignments(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  clerkId: string,
) {
  const rows = await ctx.db
    .query("jobSiteAssignments")
    .withIndex("by_tenant_id_and_clerk_id", (q) => q.eq("tenantId", tenantId).eq("clerkId", clerkId))
    .take(assignmentPageLimit);
  for (const row of rows) await ctx.db.delete(row._id);
}

// Removes every worker assignment that points at a job site.
export async function deleteSiteAssignments(ctx: MutationCtx, jobSiteId: Id<"jobSites">) {
  const rows = await ctx.db
    .query("jobSiteAssignments")
    .withIndex("by_job_site_id", (q) => q.eq("jobSiteId", jobSiteId))
    .take(assignmentPageLimit);
  for (const row of rows) await ctx.db.delete(row._id);
}

// Trims a company name and rejects an empty or oversized one.
export function companyName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) throw new ConvexError("Enter a company name.");
  if (name.length > 80) throw new ConvexError("Company name must be 80 characters or fewer.");
  return name;
}

// Trims a company address and rejects one that is too long.
export function companyAddress(value: string) {
  const address = value.trim();
  if (address.length > 200) throw new ConvexError("Address must be 200 characters or fewer.");
  return address;
}

// Trims a company phone number and rejects one that is too long.
export function companyPhone(value: string) {
  const phone = value.trim();
  if (phone.length > 40) throw new ConvexError("Phone must be 40 characters or fewer.");
  if (phone && !/^[0-9+().\-\s]+$/.test(phone)) {
    throw new ConvexError("Enter a phone number using digits and + ( ) . -.");
  }
  return phone;
}

const companyImageBytes = 5 * 1024 * 1024;
const companyImageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Rejects an uploaded photo that is missing, too large, or not an image.
async function requireImageFile(ctx: MutationCtx, imageStorageId: Id<"_storage">, missing: string) {
  const meta = await ctx.db.system.get("_storage", imageStorageId);
  if (!meta) throw new ConvexError(missing);
  if (meta.size > companyImageBytes) throw new ConvexError("Choose a photo smaller than 5 MB.");
  if (!meta.contentType || !companyImageTypes.has(meta.contentType)) {
    throw new ConvexError("Upload a PNG, JPG, WEBP, or GIF.");
  }
}

// Rejects a company photo that is missing, too large, or not an image.
export async function requireCompanyImage(ctx: MutationCtx, imageStorageId: Id<"_storage">) {
  await requireImageFile(ctx, imageStorageId, "Upload the company photo again.");
}

// Rejects a profile photo that is missing, too large, or not an image.
export async function requireProfileImage(ctx: MutationCtx, imageStorageId: Id<"_storage">) {
  await requireImageFile(ctx, imageStorageId, "Upload your photo again.");
}

// Stores or removes the signed-in person's profile photo.
export async function setSignedInProfileImage(ctx: MutationCtx, imageStorageId: Id<"_storage"> | null) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("You need to sign in.");
  if (imageStorageId) await requireProfileImage(ctx, imageStorageId);

  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!existing) throw new ConvexError("Your account is still being created.");

  const previousId = existing.imageStorageId;
  await ctx.db.replace(existing._id, {
    clerkId: existing.clerkId,
    name: existing.name,
    email: existing.email,
    ...(imageStorageId ? { imageStorageId } : {}),
  });
  if (previousId && previousId !== imageStorageId) await ctx.storage.delete(previousId);
}

// Trims a company contact email, and rejects one that is not an email address.
export function companyContactEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!email) return "";
  if (!emailPattern.test(email)) throw new ConvexError("Enter a valid contact email.");
  return email;
}

// Trims a job site name and rejects an empty or oversized one.
export function siteName(value: string) {
  const name = value.trim();
  if (!name) throw new ConvexError("Enter a site name.");
  if (name.length > 80) throw new ConvexError("Site name must be 80 characters or fewer.");
  return name;
}

// Trims a job site address and rejects one that is too long.
export function siteAddress(value: string) {
  const address = value.trim();
  if (address.length > 200) throw new ConvexError("Address must be 200 characters or fewer.");
  return address;
}

// Rejects a job site name that another site in the same company already uses.
export async function assertUniqueName(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  name: string,
  exceptId?: Id<"jobSites">,
) {
  const matches = await ctx.db
    .query("jobSites")
    .withIndex("by_tenant_id_and_name", (q) => q.eq("tenantId", tenantId).eq("name", name))
    .take(2);
  if (matches.some((site) => site._id !== exceptId)) {
    throw new ConvexError("A job site with that name already exists.");
  }
}

// Rejects removal when a timesheet, invoice, or holiday request still points at the site.
export async function assertUnused(ctx: MutationCtx, jobSiteId: Id<"jobSites">) {
  const timesheet = await ctx.db
    .query("timesheets")
    .withIndex("by_job_site_id", (q) => q.eq("jobSiteId", jobSiteId))
    .take(1);
  const invoice = await ctx.db
    .query("workerInvoices")
    .withIndex("by_job_site_id", (q) => q.eq("jobSiteId", jobSiteId))
    .take(1);
  const holiday = await ctx.db
    .query("holidayRequests")
    .withIndex("by_job_site_id", (q) => q.eq("jobSiteId", jobSiteId))
    .take(1);
  if (timesheet.length > 0 || invoice.length > 0 || holiday.length > 0) {
    throw new ConvexError(
      "This job site is used by a timesheet, invoice, or holiday request, so it can't be removed.",
    );
  }
}

// Adds up the seven daily hour values on a timesheet.
export function totalHours(hours: DayHours) {
  return (
    hours.monday +
    hours.tuesday +
    hours.wednesday +
    hours.thursday +
    hours.friday +
    hours.saturday +
    hours.sunday
  );
}

// Returns the name and email stored for a Clerk user, with a fallback when the row is missing.
export async function workerLabel(ctx: QueryCtx | MutationCtx, clerkId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
  return {
    name: user?.name || "Worker",
    email: user?.email || "",
  };
}

// Returns a job site name only when that site belongs to the company.
export async function jobSiteLabel(
  ctx: QueryCtx | MutationCtx,
  tenantId: Id<"tenants">,
  jobSiteId: Id<"jobSites">,
) {
  const site = await ctx.db.get(jobSiteId);
  if (!site || site.tenantId !== tenantId) return "Unknown site";
  return site.name;
}

// Returns the invoice files an admin can open, using the file list when it exists.
export async function invoiceFileLinks(ctx: QueryCtx | MutationCtx, invoice: Doc<"workerInvoices">) {
  const stored =
    invoice.invoiceFiles && invoice.invoiceFiles.length > 0
      ? invoice.invoiceFiles
      : [{ fileStorageId: invoice.fileStorageId, fileName: invoice.fileName }];
  const seen = new Set<string>();
  const files = [];
  for (const file of stored) {
    if (seen.has(file.fileStorageId)) continue;
    seen.add(file.fileStorageId);
    files.push({
      fileName: file.fileName?.trim() || "Invoice file",
      url: await ctx.storage.getUrl(file.fileStorageId),
    });
  }
  return files;
}

const invoiceFileBytes = 10 * 1024 * 1024;
const invoiceFileTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);

// Checks that an invoice month is a real YYYY-MM and is not in the future.
export function invoiceMonth(value: string) {
  const match = monthPattern.exec(value);
  if (!match) throw new ConvexError("Choose a month.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new ConvexError("Choose a month.");
  const today = new Date();
  const current = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1);
  if (Date.UTC(year, month - 1, 1) > current) {
    throw new ConvexError("That month has not started yet.");
  }
  return `${match[1]}-${match[2]}`;
}

// Keeps an optional invoice amount as a positive number with two decimal places.
export function invoiceAmount(value: number | undefined) {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
    throw new ConvexError("Enter an amount greater than 0, or leave it blank.");
  }
  return Math.round(value * 100) / 100;
}

// Checks an uploaded invoice file and returns the name stored with it.
export async function requireInvoiceFile(
  ctx: QueryCtx | MutationCtx,
  fileStorageId: Id<"_storage">,
  fileName: string | undefined,
) {
  const meta = await ctx.storage.getMetadata(fileStorageId);
  if (!meta) throw new ConvexError("Upload the invoice file again.");
  if (meta.size > invoiceFileBytes) throw new ConvexError("Each file must be 10 MB or smaller.");
  if (!meta.contentType || !invoiceFileTypes.has(meta.contentType)) {
    throw new ConvexError("Upload a PDF, PNG, or JPG.");
  }
  const name = fileName?.trim().replace(/[/\\]/g, "") ?? "";
  if (name.length > 180) throw new ConvexError("File names must be 180 characters or fewer.");
  return { fileStorageId, fileName: name || "Invoice file" };
}

// Checks a calendar date and returns it as YYYY-MM-DD.
export function calendarDate(value: string) {
  const match = datePattern.exec(value);
  if (!match) throw new ConvexError("Choose a date.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ConvexError("Choose a date.");
  }
  return { iso: `${match[1]}-${match[2]}-${match[3]}`, time: date.getTime() };
}

// Checks a holiday range and returns the stored start and end dates.
export function holidayRange(startDate: string, endDate: string) {
  const start = calendarDate(startDate);
  const end = calendarDate(endDate);
  if (end.time < start.time) {
    throw new ConvexError("The end date must be on or after the start date.");
  }
  const days = (end.time - start.time) / (24 * 60 * 60 * 1000);
  if (days > 366) throw new ConvexError("Choose a holiday of a year or less.");
  return { startDate: start.iso, endDate: end.iso };
}

// Trims a holiday reason and rejects an empty or oversized one.
export function holidayReason(value: string) {
  const reason = value.trim();
  if (!reason) throw new ConvexError("Enter a reason.");
  if (reason.length > 500) throw new ConvexError("Reason must be 500 characters or fewer.");
  return reason;
}

// Returns a pending holiday request that belongs to the company, or rejects the call.
export async function requirePendingHoliday(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  holidayRequestId: Id<"holidayRequests">,
) {
  const holiday = await ctx.db.get(holidayRequestId);
  if (!holiday || holiday.tenantId !== tenantId) {
    throw new ConvexError("That holiday request is not in this company.");
  }
  if (holiday.status !== "pending") {
    throw new ConvexError("Only a submitted holiday request can be approved or rejected.");
  }
  return holiday;
}

// Returns a pending invoice that belongs to the company, or rejects the call.
export async function requirePendingInvoice(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  invoiceId: Id<"workerInvoices">,
) {
  const invoice = await ctx.db.get(invoiceId);
  if (!invoice || invoice.tenantId !== tenantId) {
    throw new ConvexError("That invoice is not in this company.");
  }
  if (invoice.status !== "pending") {
    throw new ConvexError("Only a submitted invoice can be approved or rejected.");
  }
  return invoice;
}

// Returns a pending timesheet that belongs to the company, or rejects the call.
export async function requirePendingTimesheet(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  timesheetId: Id<"timesheets">,
) {
  const timesheet = await ctx.db.get(timesheetId);
  if (!timesheet || timesheet.tenantId !== tenantId) {
    throw new ConvexError("That timesheet is not in this company.");
  }
  if (timesheet.status !== "pending") {
    throw new ConvexError("Only a submitted timesheet can be approved or rejected.");
  }
  return timesheet;
}

type SubmissionKind = "timesheet" | "invoice" | "holiday";
type NoticeKind = SubmissionKind | "member";

type Notice = {
  kind: NoticeKind;
  title: string;
  body: string;
  href: string;
  sourceId?: string;
};

const adminLimit = 20;

// Returns a person's display name and profile photo.
async function faceForClerk(ctx: QueryCtx, clerkId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
  return {
    name: user?.name.trim() || "Someone",
    imageUrl: user?.imageStorageId ? await ctx.storage.getUrl(user.imageStorageId) : null,
  };
}

// Turns a notification into the person, action, and photo shown in recent activity.
export async function activityLine(ctx: QueryCtx, notification: Doc<"notifications">) {
  const label =
    notification.kind === "holiday" ? "holiday request" : notification.kind === "member" ? "" : notification.kind;

  if (notification.kind === "member" && notification.sourceId) {
    if (notification.title === "Worker joined") {
      const membershipId = ctx.db.normalizeId("memberships", notification.sourceId);
      const membership = membershipId ? await ctx.db.get(membershipId) : null;
      if (membership) {
        const person = await faceForClerk(ctx, membership.clerkId);
        return { actor: person.name, action: "joined the company", imageUrl: person.imageUrl };
      }
    }
    if (notification.title === "Worker invited") {
      const inviteId = ctx.db.normalizeId("invites", notification.sourceId);
      const invite = inviteId ? await ctx.db.get(inviteId) : null;
      const email = invite?.email ?? notification.body.replace(/ was invited to join\.$/, "");
      const account = email
        ? await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", email))
            .unique()
        : null;
      return {
        actor: account?.name.trim() || email || "Someone",
        action: "was invited to join",
        imageUrl: account?.imageStorageId ? await ctx.storage.getUrl(account.imageStorageId) : null,
      };
    }
  }

  if (label && notification.sourceId && notification.title.endsWith("to review")) {
    const table =
      notification.kind === "timesheet"
        ? "timesheets"
        : notification.kind === "invoice"
          ? "workerInvoices"
          : "holidayRequests";
    const recordId = ctx.db.normalizeId(table, notification.sourceId);
    const record = recordId ? await ctx.db.get(recordId) : null;
    if (record) {
      const person = await faceForClerk(ctx, record.clerkId);
      return { actor: person.name, action: `submitted a ${label} for review`, imageUrl: person.imageUrl };
    }
  }

  if (label && (notification.title.endsWith("approved") || notification.title.endsWith("rejected"))) {
    const status = notification.title.endsWith("approved") ? "approved" : "rejected";
    const admins = await ctx.db
      .query("memberships")
      .withIndex("by_tenant_id_and_role", (q) => q.eq("tenantId", notification.tenantId).eq("role", "admin"))
      .take(2);
    const person = admins.length === 1 ? await faceForClerk(ctx, admins[0].clerkId) : null;
    return {
      actor: person?.name ?? "An administrator",
      action: `${status} your ${label}`,
      imageUrl: person?.imageUrl ?? null,
    };
  }

  return { actor: "Update", action: notification.body, imageUrl: null };
}

// Returns the signed-in person's membership, or rejects the call.
export async function requireMembership(ctx: QueryCtx | MutationCtx): Promise<Doc<"memberships">> {
  const identity = await ctx.auth.getUserIdentity();
  const clerkId = identity?.subject;
  if (!clerkId) throw new Error("Unauthorized");

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
  if (!membership) throw new Error("Forbidden");
  return membership;
}

// Tells every admin in the company that a worker submitted something for review.
export async function notifyAdminsOfSubmission(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  clerkId: string,
  kind: SubmissionKind,
  sourceId: string,
) {
  const worker = await workerLabel(ctx, clerkId);
  const label = kind === "holiday" ? "holiday request" : kind;
  const href =
    kind === "timesheet"
      ? "/dashboard/admin/timesheets"
      : kind === "invoice"
        ? "/dashboard/admin/invoices"
        : "/dashboard/admin/holidays";
  const title =
    kind === "timesheet" ? "Timesheet to review" : kind === "invoice" ? "Invoice to review" : "Holiday request to review";
  await notifyAdmins(ctx, tenantId, {
    kind,
    title,
    body: `${worker.name} submitted a ${label} for review.`,
    href,
    sourceId,
  });
}

// Tells the worker that an admin approved or rejected their submission.
export async function notifyWorkerOfDecision(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  clerkId: string,
  kind: SubmissionKind,
  status: "approved" | "rejected",
  reason = "",
) {
  const label = kind === "holiday" ? "holiday request" : kind;
  const href =
    kind === "timesheet"
      ? "/dashboard/worker/timesheets"
      : kind === "invoice"
        ? "/dashboard/worker/invoices"
        : "/dashboard/worker/holidays";
  const titleKind = kind === "holiday" ? "Holiday request" : kind === "invoice" ? "Invoice" : "Timesheet";
  const detail = status === "rejected" && reason ? ` Reason: ${reason}` : "";
  await notifyMember(ctx, tenantId, clerkId, {
    kind,
    title: `${titleKind} ${status}`,
    body: `Your ${label} was ${status}.${detail}`,
    href,
  });
}

// Tells every admin that a worker was invited.
export async function notifyAdminsOfInvite(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  email: string,
  sourceId: string,
  createdAt?: number,
) {
  await notifyAdmins(
    ctx,
    tenantId,
    {
      kind: "member",
      title: "Worker invited",
      body: `${email} was invited to join.`,
      href: "/dashboard/admin/workers",
      sourceId,
    },
    createdAt,
  );
}

// Tells every admin that an invited worker joined the company.
export async function notifyAdminsOfJoin(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  clerkId: string,
  sourceId: string,
  createdAt?: number,
) {
  const worker = await workerLabel(ctx, clerkId);
  const who = worker.name !== "Worker" ? worker.name : worker.email || "A worker";
  await notifyAdmins(
    ctx,
    tenantId,
    {
      kind: "member",
      title: "Worker joined",
      body: `${who} joined the company.`,
      href: "/dashboard/admin/workers",
      sourceId,
    },
    createdAt,
  );
}

// Writes one notification for every admin in the company.
async function notifyAdmins(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  notice: Notice,
  createdAt = Date.now(),
) {
  const admins = await ctx.db
    .query("memberships")
    .withIndex("by_tenant_id_and_role", (q) => q.eq("tenantId", tenantId).eq("role", "admin"))
    .take(adminLimit);
  for (const admin of admins) {
    const { sourceId, ...rest } = notice;
    await ctx.db.insert("notifications", {
      tenantId,
      recipientClerkId: admin.clerkId,
      ...rest,
      ...(sourceId ? { sourceId } : {}),
      read: false,
      createdAt,
    });
  }
}

// Returns the Clerk secret configured for this deployment.
function clerkSecret() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new ConvexError("Worker sign-in is not configured yet.");
  return key;
}

// Reads the first Clerk error from a failed response.
async function clerkError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    errors?: { code?: string; long_message?: string; message?: string }[];
  } | null;
  const error = body?.errors?.[0];
  return { code: error?.code ?? "", message: error?.long_message || error?.message || "" };
}

// Keeps a browser origin and points it at the sign-up page.
export function signUpLink(origin: string) {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new ConvexError("Could not build the invite link.");
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new ConvexError("Could not build the invite link.");
  }
  return `${url.origin}/sign-up`;
}

// Asks Clerk to email an invitation the worker can accept.
export async function createClerkInvitation(email: string, redirectUrl: string) {
  const response = await fetch("https://api.clerk.com/v1/invitations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clerkSecret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: email,
      redirect_url: redirectUrl,
      notify: true,
      ignore_existing: false,
    }),
  });
  if (response.ok) {
    const body = (await response.json()) as { id?: string };
    if (!body.id) throw new ConvexError("Could not email that worker.");
    return body.id;
  }
  const error = await clerkError(response);
  if (
    error.code === "form_identifier_exists" ||
    error.code === "duplicate_record" ||
    error.code === "invitation_already_pending"
  ) {
    return null;
  }
  throw new ConvexError(error.message || "Could not email that worker.");
}

// Revokes a Clerk invitation so its link stops working.
export async function revokeClerkInvitation(invitationId: string) {
  const response = await fetch(
    `https://api.clerk.com/v1/invitations/${encodeURIComponent(invitationId)}/revoke`,
    { method: "POST", headers: { Authorization: `Bearer ${clerkSecret()}` } },
  );
  if (response.ok || response.status === 404) return;
  throw new ConvexError("Could not cancel that invite.");
}

// Deletes a Clerk user created by an older invite.
export async function deleteClerkUser(clerkId: string) {
  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${clerkSecret()}` },
  });
  if (response.ok || response.status === 404) return;
  throw new ConvexError("Could not cancel that invite.");
}

// Writes one notification for a specific person in the company.
async function notifyMember(ctx: MutationCtx, tenantId: Id<"tenants">, clerkId: string, notice: Notice) {
  await ctx.db.insert("notifications", {
    tenantId,
    recipientClerkId: clerkId,
    kind: notice.kind,
    title: notice.title,
    body: notice.body,
    href: notice.href,
    read: false,
    createdAt: Date.now(),
  });
}

const sampleWorkers = [
  { clerkId: "seed_worker_01", name: "Amina Rahman", email: "amina.rahman@example.com" },
  { clerkId: "seed_worker_02", name: "James Okonkwo", email: "james.okonkwo@example.com" },
  { clerkId: "seed_worker_03", name: "Priya Shah", email: "priya.shah@example.com" },
  { clerkId: "seed_worker_04", name: "Daniel Brooks", email: "daniel.brooks@example.com" },
  { clerkId: "seed_worker_05", name: "Fatima Ali", email: "fatima.ali@example.com" },
  { clerkId: "seed_worker_06", name: "Lucas Meyer", email: "lucas.meyer@example.com" },
  { clerkId: "seed_worker_07", name: "Hannah Kim", email: "hannah.kim@example.com" },
  { clerkId: "seed_worker_08", name: "Omar Hassan", email: "omar.hassan@example.com" },
  { clerkId: "seed_worker_09", name: "Sofia Alvarez", email: "sofia.alvarez@example.com" },
  { clerkId: "seed_worker_10", name: "Noah Patel", email: "noah.patel@example.com" },
  { clerkId: "seed_worker_11", name: "Grace Chen", email: "grace.chen@example.com" },
  { clerkId: "seed_worker_12", name: "Malik Thompson", email: "malik.thompson@example.com" },
  { clerkId: "seed_worker_13", name: "Elena Rossi", email: "elena.rossi@example.com" },
  { clerkId: "seed_worker_14", name: "Yusuf Ahmed", email: "yusuf.ahmed@example.com" },
  { clerkId: "seed_worker_15", name: "Chloe Martin", email: "chloe.martin@example.com" },
  { clerkId: "seed_worker_16", name: "Arjun Mehta", email: "arjun.mehta@example.com" },
  { clerkId: "seed_worker_17", name: "Leah Goldstein", email: "leah.goldstein@example.com" },
  { clerkId: "seed_worker_18", name: "Samuel Wright", email: "samuel.wright@example.com" },
  { clerkId: "seed_worker_19", name: "Maya Singh", email: "maya.singh@example.com" },
  { clerkId: "seed_worker_20", name: "Ben Carter", email: "ben.carter@example.com" },
];

const sampleJobSites = [
  { name: "Clifton Block 5", address: "Khayaban-e-Saadi, Clifton" },
  { name: "DHA Phase 6", address: "26th Street, DHA Phase 6" },
  { name: "PECHS Block 2", address: "Shahrah-e-Faisal, PECHS" },
  { name: "Gulshan-e-Iqbal", address: "University Road, Block 13" },
  { name: "North Nazimabad Block H", address: "5th Avenue, Block H" },
  { name: "Korangi Industrial", address: "Sector 15, Korangi" },
  { name: "Saddar Market", address: "Abdullah Haroon Road" },
  { name: "Bahria Town", address: "Precinct 11, Bahria Town" },
  { name: "Malir Cantt", address: "Airport Road, Malir" },
  { name: "Lyari Riverside", address: "Mauripur Road, Lyari" },
  { name: "SITE Area", address: "Manghopir Road, SITE" },
  { name: "Orangi Town", address: "Sector 5, Orangi" },
  { name: "Federal B Area", address: "Block 14, Federal B Area" },
  { name: "Defence View", address: "Korangi Road, Defence View" },
  { name: "Scheme 33", address: "University Road, Scheme 33" },
];

// Adds the sample workers and job sites to the only company when they are not already there.
export async function seedSampleRoster(ctx: MutationCtx) {
  const tenants = await ctx.db.query("tenants").take(2);
  if (tenants.length !== 1) {
    throw new ConvexError("Seed expects exactly one company.");
  }
  const tenantId = tenants[0]._id;

  let workersAdded = 0;
  for (const worker of sampleWorkers) {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", worker.clerkId))
      .unique();
    if (existingUser) {
      await ctx.db.patch(existingUser._id, { name: worker.name, email: worker.email });
    } else {
      await ctx.db.insert("users", worker);
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", worker.clerkId))
      .unique();
    if (membership) continue;
    await ctx.db.insert("memberships", {
      tenantId,
      clerkId: worker.clerkId,
      role: "worker",
    });
    workersAdded += 1;
  }

  let jobSitesAdded = 0;
  for (const site of sampleJobSites) {
    const existing = await ctx.db
      .query("jobSites")
      .withIndex("by_tenant_id_and_name", (q) => q.eq("tenantId", tenantId).eq("name", site.name))
      .unique();
    if (existing) continue;
    await ctx.db.insert("jobSites", { tenantId, name: site.name, address: site.address });
    jobSitesAdded += 1;
  }

  return { workersAdded, jobSitesAdded };
}

const shortRejection = "Hours do not match the site sign-in sheet.";
const longTimesheetRejection =
  "Thursday shows 10 hours on the timesheet, but the site gate log only has 6.5 hours, and Friday includes 4 hours after the site closed at 5pm. Saturday is listed at the weekday rate. Please correct Thursday and Friday, move Saturday to the weekend line, and add a short note from the site supervisor before resubmitting. We cannot approve this until those three days match the attendance record.";
const longInvoiceRejection =
  "The invoice quotes weekday rates for Saturday, and the overtime lines do not match the approved timesheet. Thursday and Friday are billed at 10 hours, but the approved sheet only has 6.5 and 4 hours after close. Please reissue the PDF against the approved hours, attach the supervisor's note, and resubmit. We cannot pay this version.";
const longHolidayRejection =
  "The Korangi shutdown is booked for the first week of December, and you are rostered as the lead electrician for the panel changeover. We can cover 4 and 5 December if you resubmit those two days on their own. The full week cannot be approved because the shutdown cannot move, and there is no one else signed off to isolate the boards.";

type SampleStatus = "pending" | "approved" | "rejected";
type SampleHours = Doc<"timesheets">["hours"];

const weekday: SampleHours = { monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0 };
const shortWeek: SampleHours = { monday: 8, tuesday: 8, wednesday: 4, thursday: 0, friday: 0, saturday: 0, sunday: 0 };
const overtime: SampleHours = { monday: 10, tuesday: 10, wednesday: 10, thursday: 10, friday: 8, saturday: 6, sunday: 0 };
const weekend: SampleHours = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 8, saturday: 8, sunday: 8 };
const decimals: SampleHours = { monday: 7.5, tuesday: 7.5, wednesday: 7.5, thursday: 7.5, friday: 7.5, saturday: 0, sunday: 0 };
const oneLongDay: SampleHours = { monday: 24, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 };
const mixedHours: SampleHours = { monday: 6, tuesday: 7.25, wednesday: 8, thursday: 8.5, friday: 9, saturday: 4, sunday: 0 };

// Returns a job site in this company by its exact name.
async function sampleSite(ctx: MutationCtx, tenantId: Id<"tenants">, name: string) {
  const site = await ctx.db
    .query("jobSites")
    .withIndex("by_tenant_id_and_name", (q) => q.eq("tenantId", tenantId).eq("name", name))
    .unique();
  if (!site) throw new ConvexError(`Missing job site ${name}. Run the roster seed first.`);
  return site._id;
}

// Stores a tiny PDF so a sample invoice has a file the admin can open.
export async function storeSamplePdf(ctx: ActionCtx, title: string) {
  const text = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 400 200]/Contents 4 0 R>>endobj
4 0 obj<</Length 55>>stream
BT /F1 18 Tf 40 100 Td (${title}) Tj ET
endstream
endobj
trailer<</Root 1 0 R>>
%%EOF`;
  return await ctx.storage.store(new Blob([text], { type: "application/pdf" }));
}

const sampleInvoiceFileNames = [
  "amina-clifton-oct.pdf",
  "james-dha-sep.pdf",
  "hannah-saddar-oct.pdf",
  "hannah-saddar-receipt.jpg.pdf",
  "noah-lyari-aug.pdf",
  "priya-pechs-aug.pdf",
  "daniel-gulshan-sep.pdf",
  "omar-bahria-jul.pdf",
  "grace-site-sep.pdf",
  "fatima-block-h-sep.pdf",
  "sofia-malir-aug.pdf",
  "lucas-korangi-aug.pdf",
  "malik-orangi-jul.pdf",
  "sarim-clifton-oct.pdf",
  "sarim-dha-sep.pdf",
  "sarim-dha-sep-receipt.pdf",
  "sarim-korangi-aug.pdf",
  "sarim-site1-jul.pdf",
  "sarim-korangi-sep.pdf",
  "sarim-clifton-aug.pdf",
];

// Returns the sample invoice file names that need a stored PDF.
export function listSampleInvoiceFileNames() {
  return sampleInvoiceFileNames;
}

// Returns only Sarim YT's sample invoice file names.
export function listSarimInvoiceFileNames() {
  return sampleInvoiceFileNames.filter((fileName) => fileName.startsWith("sarim-"));
}

// Assigns sample workers to job sites and inserts timesheets, invoices, and holiday requests.
export async function seedSampleActivity(
  ctx: MutationCtx,
  files: Array<{ fileName: string; fileStorageId: Id<"_storage"> }>,
) {
  if (longTimesheetRejection.length > 500 || longInvoiceRejection.length > 500 || longHolidayRejection.length > 500) {
    throw new ConvexError("Sample rejection reason is too long.");
  }
  const tenants = await ctx.db.query("tenants").take(2);
  if (tenants.length !== 1) throw new ConvexError("Seed expects exactly one company.");
  const tenantId = tenants[0]._id;

  const siteNames = [
    "Clifton Block 5",
    "DHA Phase 6",
    "PECHS Block 2",
    "Gulshan-e-Iqbal",
    "North Nazimabad Block H",
    "Korangi Industrial",
    "Saddar Market",
    "Bahria Town",
    "Malir Cantt",
    "Lyari Riverside",
    "SITE Area",
    "Orangi Town",
    "Federal B Area",
    "Defence View",
    "Scheme 33",
    "Site 1",
  ] as const;
  const sites: Record<(typeof siteNames)[number], Id<"jobSites">> = {
    "Clifton Block 5": await sampleSite(ctx, tenantId, "Clifton Block 5"),
    "DHA Phase 6": await sampleSite(ctx, tenantId, "DHA Phase 6"),
    "PECHS Block 2": await sampleSite(ctx, tenantId, "PECHS Block 2"),
    "Gulshan-e-Iqbal": await sampleSite(ctx, tenantId, "Gulshan-e-Iqbal"),
    "North Nazimabad Block H": await sampleSite(ctx, tenantId, "North Nazimabad Block H"),
    "Korangi Industrial": await sampleSite(ctx, tenantId, "Korangi Industrial"),
    "Saddar Market": await sampleSite(ctx, tenantId, "Saddar Market"),
    "Bahria Town": await sampleSite(ctx, tenantId, "Bahria Town"),
    "Malir Cantt": await sampleSite(ctx, tenantId, "Malir Cantt"),
    "Lyari Riverside": await sampleSite(ctx, tenantId, "Lyari Riverside"),
    "SITE Area": await sampleSite(ctx, tenantId, "SITE Area"),
    "Orangi Town": await sampleSite(ctx, tenantId, "Orangi Town"),
    "Federal B Area": await sampleSite(ctx, tenantId, "Federal B Area"),
    "Defence View": await sampleSite(ctx, tenantId, "Defence View"),
    "Scheme 33": await sampleSite(ctx, tenantId, "Scheme 33"),
    "Site 1": await sampleSite(ctx, tenantId, "Site 1"),
  };

  const assignments: Array<[string, (typeof siteNames)[number]]> = [
    ["seed_worker_01", "Clifton Block 5"],
    ["seed_worker_01", "DHA Phase 6"],
    ["seed_worker_01", "Site 1"],
    ["seed_worker_02", "DHA Phase 6"],
    ["seed_worker_02", "PECHS Block 2"],
    ["seed_worker_03", "PECHS Block 2"],
    ["seed_worker_04", "Gulshan-e-Iqbal"],
    ["seed_worker_05", "North Nazimabad Block H"],
    ["seed_worker_06", "Korangi Industrial"],
    ["seed_worker_07", "Saddar Market"],
    ["seed_worker_07", "Clifton Block 5"],
    ["seed_worker_08", "Bahria Town"],
    ["seed_worker_09", "Malir Cantt"],
    ["seed_worker_10", "Lyari Riverside"],
    ["seed_worker_11", "SITE Area"],
    ["seed_worker_12", "Orangi Town"],
    ["seed_worker_13", "Federal B Area"],
    ["seed_worker_13", "Defence View"],
    ["seed_worker_14", "Defence View"],
    ["seed_worker_15", "Scheme 33"],
    ["seed_worker_16", "Site 1"],
    ["seed_worker_16", "Clifton Block 5"],
    ["seed_worker_17", "Gulshan-e-Iqbal"],
    ["seed_worker_17", "Korangi Industrial"],
    ["seed_worker_18", "Bahria Town"],
    ["seed_worker_18", "Malir Cantt"],
    ["seed_worker_19", "Scheme 33"],
    ["seed_worker_19", "Site 1"],
    ["seed_worker_20", "SITE Area"],
    ["seed_worker_20", "Orangi Town"],
    ["user_3KlzGyq6huxq3rs1GOLeATV2GsU", "Clifton Block 5"],
    ["user_3KlzGyq6huxq3rs1GOLeATV2GsU", "DHA Phase 6"],
    ["user_3KlzGyq6huxq3rs1GOLeATV2GsU", "Korangi Industrial"],
  ];

  let assignmentsAdded = 0;
  for (const [clerkId, siteName] of assignments) {
    const jobSiteId = sites[siteName];
    const existing = await ctx.db
      .query("jobSiteAssignments")
      .withIndex("by_clerk_id_and_job_site_id", (q) => q.eq("clerkId", clerkId).eq("jobSiteId", jobSiteId))
      .unique();
    if (existing) continue;
    await ctx.db.insert("jobSiteAssignments", { tenantId, clerkId, jobSiteId });
    assignmentsAdded += 1;
  }

  const timesheets: Array<{
    clerkId: string;
    site: (typeof siteNames)[number];
    weekStart: string;
    weekEnd: string;
    hours: SampleHours;
    comments: string;
    status: SampleStatus;
    rejectionReason: string;
  }> = [
    { clerkId: "seed_worker_01", site: "Clifton Block 5", weekStart: "2026-10-05", weekEnd: "2026-10-11", hours: weekday, comments: "Regular week on the Clifton fit-out.", status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_02", site: "DHA Phase 6", weekStart: "2026-10-12", weekEnd: "2026-10-18", hours: shortWeek, comments: "", status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_07", site: "Saddar Market", weekStart: "2026-09-28", weekEnd: "2026-10-04", hours: mixedHours, comments: "Rain stopped work on Wednesday afternoon, so Thursday ran long to make up the plastering. Saturday was a half day to finish the shopfront before the market opened.", status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_10", site: "Lyari Riverside", weekStart: "2026-09-21", weekEnd: "2026-09-27", hours: decimals, comments: "Half-hour lunch deducted each weekday.", status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_03", site: "PECHS Block 2", weekStart: "2026-09-14", weekEnd: "2026-09-20", hours: weekday, comments: "Approved against the site diary.", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_04", site: "Gulshan-e-Iqbal", weekStart: "2026-09-07", weekEnd: "2026-09-13", hours: overtime, comments: "Overtime agreed with the supervisor for the slab pour.", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_08", site: "Bahria Town", weekStart: "2026-08-31", weekEnd: "2026-09-06", hours: weekend, comments: "Weekend handover shift.", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_11", site: "SITE Area", weekStart: "2026-08-24", weekEnd: "2026-08-30", hours: oneLongDay, comments: "Emergency call-out on Monday.", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_05", site: "North Nazimabad Block H", weekStart: "2026-08-17", weekEnd: "2026-08-23", hours: weekday, comments: "", status: "rejected", rejectionReason: shortRejection },
    { clerkId: "seed_worker_09", site: "Malir Cantt", weekStart: "2026-08-10", weekEnd: "2026-08-16", hours: shortWeek, comments: "Left early on Wednesday.", status: "rejected", rejectionReason: "Wednesday hours belong on Defence View, not Malir." },
    { clerkId: "seed_worker_06", site: "Korangi Industrial", weekStart: "2026-08-03", weekEnd: "2026-08-09", hours: overtime, comments: "Claiming the full overtime week.", status: "rejected", rejectionReason: longTimesheetRejection },
    { clerkId: "seed_worker_12", site: "Orangi Town", weekStart: "2026-07-27", weekEnd: "2026-08-02", hours: mixedHours, comments: "Please see the attached site note about the delayed concrete delivery.", status: "rejected", rejectionReason: "The Saturday half day was not authorised, and the Tuesday entry of 7.25 hours does not match the 6 hours on the gate log. Remove Saturday, correct Tuesday, and resubmit. The rest of the week is fine, but we cannot approve a timesheet that still includes unauthorised weekend time or a day that disagrees with the attendance record." },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "DHA Phase 6", weekStart: "2026-10-12", weekEnd: "2026-10-18", hours: shortWeek, comments: "Left after the concrete delivery on Wednesday.", status: "pending", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Clifton Block 5", weekStart: "2026-10-05", weekEnd: "2026-10-11", hours: weekday, comments: "Regular week on the Clifton fit-out.", status: "pending", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Korangi Industrial", weekStart: "2026-09-28", weekEnd: "2026-10-04", hours: overtime, comments: "Overtime agreed for the panel changeover.", status: "approved", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Site 1", weekStart: "2026-09-21", weekEnd: "2026-09-27", hours: decimals, comments: "Half-hour lunch deducted each weekday.", status: "approved", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "DHA Phase 6", weekStart: "2026-09-14", weekEnd: "2026-09-20", hours: weekday, comments: "", status: "rejected", rejectionReason: shortRejection },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Clifton Block 5", weekStart: "2026-09-07", weekEnd: "2026-09-13", hours: overtime, comments: "Claiming the full overtime week.", status: "rejected", rejectionReason: longTimesheetRejection },
  ];

  let timesheetsAdded = 0;
  for (const sheet of timesheets) {
    const matches = await ctx.db
      .query("timesheets")
      .withIndex("by_clerk_id_and_week_start", (q) => q.eq("clerkId", sheet.clerkId).eq("weekStart", sheet.weekStart))
      .take(20);
    if (matches.some((row) => row.jobSiteId === sites[sheet.site])) continue;
    await ctx.db.insert("timesheets", {
      tenantId,
      clerkId: sheet.clerkId,
      weekStart: sheet.weekStart,
      weekEnd: sheet.weekEnd,
      jobSiteId: sites[sheet.site],
      comments: sheet.comments,
      hours: sheet.hours,
      status: sheet.status,
      rejectionReason: sheet.rejectionReason,
      updatedAt: Date.now(),
    });
    timesheetsAdded += 1;
  }

  const invoices: Array<{
    clerkId: string;
    site: (typeof siteNames)[number];
    invoiceMonth: string;
    amount?: number;
    fileName: string;
    extraFileName?: string;
    status: SampleStatus;
    rejectionReason: string;
  }> = [
    { clerkId: "seed_worker_01", site: "Clifton Block 5", invoiceMonth: "2026-10", amount: 85000, fileName: "amina-clifton-oct.pdf", status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_02", site: "DHA Phase 6", invoiceMonth: "2026-09", amount: 42500.75, fileName: "james-dha-sep.pdf", status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_07", site: "Saddar Market", invoiceMonth: "2026-10", amount: 31000, fileName: "hannah-saddar-oct.pdf", extraFileName: "hannah-saddar-receipt.jpg.pdf", status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_10", site: "Lyari Riverside", invoiceMonth: "2026-08", fileName: "noah-lyari-aug.pdf", status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_03", site: "PECHS Block 2", invoiceMonth: "2026-08", amount: 120000, fileName: "priya-pechs-aug.pdf", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_04", site: "Gulshan-e-Iqbal", invoiceMonth: "2026-09", amount: 1500, fileName: "daniel-gulshan-sep.pdf", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_08", site: "Bahria Town", invoiceMonth: "2026-07", amount: 250000, fileName: "omar-bahria-jul.pdf", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_11", site: "SITE Area", invoiceMonth: "2026-09", amount: 64000, fileName: "grace-site-sep.pdf", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_05", site: "North Nazimabad Block H", invoiceMonth: "2026-09", amount: 54000, fileName: "fatima-block-h-sep.pdf", status: "rejected", rejectionReason: "The invoice total does not match the approved hours." },
    { clerkId: "seed_worker_09", site: "Malir Cantt", invoiceMonth: "2026-08", amount: 27500, fileName: "sofia-malir-aug.pdf", status: "rejected", rejectionReason: "Wrong job site. Resubmit this against Defence View." },
    { clerkId: "seed_worker_06", site: "Korangi Industrial", invoiceMonth: "2026-08", amount: 98000, fileName: "lucas-korangi-aug.pdf", status: "rejected", rejectionReason: longInvoiceRejection },
    { clerkId: "seed_worker_12", site: "Orangi Town", invoiceMonth: "2026-07", amount: 73250.5, fileName: "malik-orangi-jul.pdf", status: "rejected", rejectionReason: "The PDF total is 73,250.50 but the line items add up to 68,100. The materials row looks duplicated from June, and there is no receipt for the 5,150 transport charge. Please send a corrected PDF with the duplicate row removed and the transport receipt attached as a second file. We will review it again once both files are on the same invoice." },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Clifton Block 5", invoiceMonth: "2026-10", amount: 42000, fileName: "sarim-clifton-oct.pdf", status: "pending", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "DHA Phase 6", invoiceMonth: "2026-09", amount: 42500.75, fileName: "sarim-dha-sep.pdf", extraFileName: "sarim-dha-sep-receipt.pdf", status: "pending", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Korangi Industrial", invoiceMonth: "2026-08", amount: 64000, fileName: "sarim-korangi-aug.pdf", status: "approved", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Site 1", invoiceMonth: "2026-07", amount: 18500, fileName: "sarim-site1-jul.pdf", status: "approved", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Korangi Industrial", invoiceMonth: "2026-09", amount: 54000, fileName: "sarim-korangi-sep.pdf", status: "rejected", rejectionReason: "The invoice total does not match the approved hours." },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Clifton Block 5", invoiceMonth: "2026-08", amount: 98000, fileName: "sarim-clifton-aug.pdf", status: "rejected", rejectionReason: longInvoiceRejection },
  ];

  let invoicesAdded = 0;
  for (const invoice of invoices) {
    const existing = await ctx.db
      .query("workerInvoices")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", invoice.clerkId))
      .take(20);
    const match = existing.find((row) => row.invoiceMonth === invoice.invoiceMonth && row.jobSiteId === sites[invoice.site]);
    if (match) {
      if ((match.rejectionReason ?? "") !== invoice.rejectionReason) {
        await ctx.db.patch(match._id, { rejectionReason: invoice.rejectionReason, updatedAt: Date.now() });
      }
      continue;
    }
    const stored = new Map(files.map((file) => [file.fileName, file.fileStorageId]));
    const fileStorageId = stored.get(invoice.fileName);
    const extraStorageId = invoice.extraFileName ? stored.get(invoice.extraFileName) : undefined;
    if (!fileStorageId || (invoice.extraFileName && !extraStorageId)) {
      throw new ConvexError(`Missing sample file for ${invoice.fileName}.`);
    }
    const invoiceFiles = [{ fileStorageId, fileName: invoice.fileName }];
    if (invoice.extraFileName && extraStorageId) {
      invoiceFiles.push({ fileStorageId: extraStorageId, fileName: invoice.extraFileName });
    }
    const primary = invoiceFiles[0];
    await ctx.db.insert("workerInvoices", {
      tenantId,
      clerkId: invoice.clerkId,
      fileStorageId: primary.fileStorageId,
      fileName: primary.fileName,
      invoiceFiles,
      invoiceMonth: invoice.invoiceMonth,
      jobSiteId: sites[invoice.site],
      ...(invoice.amount === undefined ? {} : { amount: invoice.amount }),
      status: invoice.status,
      rejectionReason: invoice.rejectionReason,
      updatedAt: Date.now(),
    });
    invoicesAdded += 1;
  }

  const longHolidayReason =
    "I need 7 to 12 December off because my sister's wedding is in Lahore and I am travelling with my parents on 7 December. The ceremonies run through 12 December, and I would be back on site the following Monday. I have already spoken to the supervisor and the other electricians can cover the shopfront work that week.";
  const longPendingHolidayReason =
    "I need 21 to 31 December off to travel with my parents for the end of the year. We leave on the 21st and I would be back on site on 4 January. I have already spoken to the supervisor, and the other electricians can cover the shopfront work while I am away.";

  const holidays: Array<{
    clerkId: string;
    site: (typeof siteNames)[number];
    startDate: string;
    endDate: string;
    reason: string;
    status: SampleStatus;
    rejectionReason: string;
  }> = [
    { clerkId: "seed_worker_01", site: "Clifton Block 5", startDate: "2026-11-02", endDate: "2026-11-06", reason: "Family wedding in Lahore.", status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_02", site: "DHA Phase 6", startDate: "2026-12-21", endDate: "2026-12-31", reason: longPendingHolidayReason, status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_07", site: "Saddar Market", startDate: "2026-10-19", endDate: "2026-10-19", reason: "Clinic appointment.", status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_10", site: "Lyari Riverside", startDate: "2026-10-20", endDate: "2026-10-23", reason: "Moving house.", status: "pending", rejectionReason: "" },
    { clerkId: "seed_worker_03", site: "PECHS Block 2", startDate: "2026-10-26", endDate: "2026-10-27", reason: "Medical appointment and recovery day.", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_04", site: "Gulshan-e-Iqbal", startDate: "2026-11-16", endDate: "2026-11-20", reason: "Annual leave.", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_08", site: "Bahria Town", startDate: "2026-09-01", endDate: "2026-09-04", reason: "Already taken. Logged after the fact.", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_16", site: "Site 1", startDate: "2026-11-30", endDate: "2026-12-02", reason: "School parents' week.", status: "approved", rejectionReason: "" },
    { clerkId: "seed_worker_05", site: "North Nazimabad Block H", startDate: "2026-11-09", endDate: "2026-11-11", reason: "Family visit.", status: "rejected", rejectionReason: "That week is already fully staffed." },
    { clerkId: "seed_worker_09", site: "Malir Cantt", startDate: "2026-12-14", endDate: "2026-12-18", reason: "Travel.", status: "rejected", rejectionReason: "Please request this on Defence View instead." },
    { clerkId: "seed_worker_06", site: "Korangi Industrial", startDate: "2026-12-01", endDate: "2026-12-05", reason: "Sister's wedding.", status: "rejected", rejectionReason: longHolidayRejection },
    { clerkId: "seed_worker_12", site: "Orangi Town", startDate: "2026-12-07", endDate: "2026-12-12", reason: longHolidayReason, status: "rejected", rejectionReason: "The slab pour is booked for 8 and 9 December, and you are the only person signed off to run it. We can approve 11 and 12 December if you resubmit those two days on their own. The longer request cannot be covered, and the site cannot pause the pour for a full week." },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "DHA Phase 6", startDate: "2026-10-19", endDate: "2026-10-19", reason: "Clinic appointment.", status: "pending", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Korangi Industrial", startDate: "2026-12-21", endDate: "2026-12-31", reason: longPendingHolidayReason, status: "pending", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "DHA Phase 6", startDate: "2026-10-26", endDate: "2026-10-27", reason: "Medical appointment and recovery day.", status: "approved", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Site 1", startDate: "2026-09-01", endDate: "2026-09-04", reason: "Already taken. Logged after the fact.", status: "approved", rejectionReason: "" },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Korangi Industrial", startDate: "2026-11-09", endDate: "2026-11-11", reason: "Family visit.", status: "rejected", rejectionReason: "That week is already fully staffed." },
    { clerkId: "user_3KlzGyq6huxq3rs1GOLeATV2GsU", site: "Clifton Block 5", startDate: "2026-12-01", endDate: "2026-12-05", reason: longHolidayReason, status: "rejected", rejectionReason: longHolidayRejection },
  ];

  let holidaysAdded = 0;
  for (const holiday of holidays) {
    const existing = await ctx.db
      .query("holidayRequests")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", holiday.clerkId))
      .take(20);
    const match = existing.find((row) => row.startDate === holiday.startDate && row.jobSiteId === sites[holiday.site]);
    if (match) {
      if (match.reason !== holiday.reason || (match.rejectionReason ?? "") !== holiday.rejectionReason) {
        await ctx.db.patch(match._id, {
          reason: holiday.reason,
          rejectionReason: holiday.rejectionReason,
          updatedAt: Date.now(),
        });
      }
      continue;
    }
    await ctx.db.insert("holidayRequests", {
      tenantId,
      clerkId: holiday.clerkId,
      jobSiteId: sites[holiday.site],
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      reason: holiday.reason,
      status: holiday.status,
      rejectionReason: holiday.rejectionReason,
      updatedAt: Date.now(),
    });
    holidaysAdded += 1;
  }

  return { assignmentsAdded, timesheetsAdded, invoicesAdded, holidaysAdded };
}
