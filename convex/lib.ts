import { ConvexError, v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

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
const weekLimitMs = 7 * 24 * 60 * 60 * 1000;

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
const monthPattern = /^(\d{4})-(\d{2})$/;

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

type NoticeKind = "timesheet" | "invoice" | "holiday";

type Notice = {
  kind: NoticeKind;
  title: string;
  body: string;
  href: string;
  sourceId?: string;
};

const adminLimit = 20;

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
  kind: NoticeKind,
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
  kind: NoticeKind,
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

// Writes one notification for every admin in the company.
async function notifyAdmins(ctx: MutationCtx, tenantId: Id<"tenants">, notice: Notice) {
  const admins = await ctx.db
    .query("memberships")
    .withIndex("by_tenant_id_and_role", (q) => q.eq("tenantId", tenantId).eq("role", "admin"))
    .take(adminLimit);
  const createdAt = Date.now();
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
