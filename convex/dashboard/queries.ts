import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import {
  daysInsideMonth,
  homeWindow,
  decidedThisWeek,
  hoursInMonth,
  jobSiteLabel,
  monthWindow,
  requireAdmin,
  requireWorker,
  workerLabel,
} from "../lib";

const memberLimit = 100;
const siteLimit = 100;
const pendingLimit = 50;

const pendingRow = v.object({
  id: v.string(),
  kind: v.union(v.literal("timesheet"), v.literal("invoice"), v.literal("holiday")),
  workerName: v.string(),
  jobSiteName: v.string(),
  detail: v.string(),
  updatedAt: v.number(),
});

// Lists workers, job sites, and pending approvals for the signed-in admin's company.
export const getAdminOverview = query({
  args: {},
  returns: v.object({
    workers: v.array(
      v.object({
        membershipId: v.id("memberships"),
        name: v.string(),
        email: v.string(),
      }),
    ),
    jobSites: v.array(v.object({ name: v.string(), address: v.union(v.string(), v.null()) })),
    pending: v.array(pendingRow),
  }),
  handler: async (ctx) => {
    const membership = await requireAdmin(ctx);
    const tenantId = membership.tenantId;

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_tenant_id_and_role", (q) => q.eq("tenantId", tenantId).eq("role", "worker"))
      .take(memberLimit);
    const workers = [];
    for (const member of memberships) {
      const worker = await workerLabel(ctx, member.clerkId);
      workers.push({ membershipId: member._id, ...worker });
    }
    workers.sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));

    const sites = await ctx.db
      .query("jobSites")
      .withIndex("by_tenant_id_and_name", (q) => q.eq("tenantId", tenantId))
      .take(siteLimit);
    const jobSites = sites.map((site) => ({
      name: site.name,
      address: site.address ?? null,
    }));

    const pending = [];
    const timesheets = await ctx.db
      .query("timesheets")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "pending"))
      .order("desc")
      .take(pendingLimit);
    for (const timesheet of timesheets) {
      const worker = await workerLabel(ctx, timesheet.clerkId);
      pending.push({
        id: timesheet._id,
        kind: "timesheet" as const,
        workerName: worker.name,
        jobSiteName: await jobSiteLabel(ctx, tenantId, timesheet.jobSiteId),
        detail: `${timesheet.weekStart}|${timesheet.weekEnd}`,
        updatedAt: timesheet.updatedAt,
      });
    }

    const invoices = await ctx.db
      .query("workerInvoices")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "pending"))
      .order("desc")
      .take(pendingLimit);
    for (const invoice of invoices) {
      const worker = await workerLabel(ctx, invoice.clerkId);
      pending.push({
        id: invoice._id,
        kind: "invoice" as const,
        workerName: worker.name,
        jobSiteName: await jobSiteLabel(ctx, tenantId, invoice.jobSiteId),
        detail: invoice.invoiceMonth,
        updatedAt: invoice.updatedAt,
      });
    }

    const holidays = await ctx.db
      .query("holidayRequests")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "pending"))
      .order("desc")
      .take(pendingLimit);
    for (const holiday of holidays) {
      const worker = await workerLabel(ctx, holiday.clerkId);
      pending.push({
        id: holiday._id,
        kind: "holiday" as const,
        workerName: worker.name,
        jobSiteName: await jobSiteLabel(ctx, tenantId, holiday.jobSiteId),
        detail: `${holiday.startDate}|${holiday.endDate}`,
        updatedAt: holiday.updatedAt,
      });
    }

    pending.sort((a, b) => b.updatedAt - a.updatedAt);
    return { workers, jobSites, pending };
  },
});

const submissionLimit = 30;

const submissionRow = v.object({
  id: v.string(),
  kind: v.union(v.literal("timesheet"), v.literal("invoice"), v.literal("holiday")),
  jobSiteName: v.string(),
  detail: v.string(),
  status: v.union(v.literal("draft"), v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  updatedAt: v.number(),
});

// Lists the signed-in worker's own timesheets, invoices, and holiday requests.
export const getWorkerOverview = query({
  args: {},
  returns: v.object({
    timesheetCount: v.number(),
    invoiceCount: v.number(),
    holidayCount: v.number(),
    submissions: v.array(submissionRow),
  }),
  handler: async (ctx) => {
    const membership = await requireWorker(ctx);
    const tenantId = membership.tenantId;
    const submissions = [];

    const timesheets = await ctx.db
      .query("timesheets")
      .withIndex("by_clerk_id_and_week_start", (q) => q.eq("clerkId", membership.clerkId))
      .order("desc")
      .take(submissionLimit);
    let timesheetCount = 0;
    for (const timesheet of timesheets) {
      if (timesheet.tenantId !== tenantId) continue;
      timesheetCount += 1;
      submissions.push({
        id: timesheet._id,
        kind: "timesheet" as const,
        jobSiteName: await jobSiteLabel(ctx, tenantId, timesheet.jobSiteId),
        detail: `${timesheet.weekStart}|${timesheet.weekEnd}`,
        status: timesheet.status,
        updatedAt: timesheet.updatedAt,
      });
    }

    const invoices = await ctx.db
      .query("workerInvoices")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", membership.clerkId))
      .order("desc")
      .take(submissionLimit);
    let invoiceCount = 0;
    for (const invoice of invoices) {
      if (invoice.tenantId !== tenantId) continue;
      invoiceCount += 1;
      submissions.push({
        id: invoice._id,
        kind: "invoice" as const,
        jobSiteName: await jobSiteLabel(ctx, tenantId, invoice.jobSiteId),
        detail: invoice.invoiceMonth,
        status: invoice.status,
        updatedAt: invoice.updatedAt,
      });
    }

    const holidays = await ctx.db
      .query("holidayRequests")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", membership.clerkId))
      .order("desc")
      .take(submissionLimit);
    let holidayCount = 0;
    for (const holiday of holidays) {
      if (holiday.tenantId !== tenantId) continue;
      holidayCount += 1;
      submissions.push({
        id: holiday._id,
        kind: "holiday" as const,
        jobSiteName: await jobSiteLabel(ctx, tenantId, holiday.jobSiteId),
        detail: `${holiday.startDate}|${holiday.endDate}`,
        status: holiday.status,
        updatedAt: holiday.updatedAt,
      });
    }

    submissions.sort((a, b) => b.updatedAt - a.updatedAt);
    return { timesheetCount, invoiceCount, holidayCount, submissions };
  },
});

const statLimit = 200;

// Counts workers, job sites, and pending reviews for the signed-in admin.
export const getAdminStats = query({
  args: {},
  returns: v.object({
    workers: v.number(),
    jobSites: v.number(),
    pendingTimesheets: v.number(),
    pendingInvoices: v.number(),
    pendingHolidays: v.number(),
  }),
  handler: async (ctx) => {
    const membership = await requireAdmin(ctx);
    const tenantId = membership.tenantId;

    const workers = await ctx.db
      .query("memberships")
      .withIndex("by_tenant_id_and_role", (q) => q.eq("tenantId", tenantId).eq("role", "worker"))
      .take(statLimit);
    const jobSites = await ctx.db
      .query("jobSites")
      .withIndex("by_tenant_id_and_name", (q) => q.eq("tenantId", tenantId))
      .take(statLimit);
    const pendingTimesheets = await ctx.db
      .query("timesheets")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "pending"))
      .take(statLimit);
    const pendingInvoices = await ctx.db
      .query("workerInvoices")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "pending"))
      .take(statLimit);
    const pendingHolidays = await ctx.db
      .query("holidayRequests")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "pending"))
      .take(statLimit);

    return {
      workers: workers.length,
      jobSites: jobSites.length,
      pendingTimesheets: pendingTimesheets.length,
      pendingInvoices: pendingInvoices.length,
      pendingHolidays: pendingHolidays.length,
    };
  },
});

// Counts the signed-in worker's timesheets, invoices, and holiday requests.
export const getWorkerStats = query({
  args: {},
  returns: v.object({
    timesheets: v.number(),
    pendingTimesheets: v.number(),
    invoices: v.number(),
    pendingInvoices: v.number(),
    holidays: v.number(),
    pendingHolidays: v.number(),
  }),
  handler: async (ctx) => {
    const membership = await requireWorker(ctx);
    const tenantId = membership.tenantId;
    let timesheets = 0;
    let pendingTimesheets = 0;
    let invoices = 0;
    let pendingInvoices = 0;
    let holidays = 0;
    let pendingHolidays = 0;

    const timesheetRows = await ctx.db
      .query("timesheets")
      .withIndex("by_clerk_id_and_week_start", (q) => q.eq("clerkId", membership.clerkId))
      .take(statLimit);
    for (const timesheet of timesheetRows) {
      if (timesheet.tenantId !== tenantId) continue;
      timesheets += 1;
      if (timesheet.status === "pending") pendingTimesheets += 1;
    }

    const invoiceRows = await ctx.db
      .query("workerInvoices")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", membership.clerkId))
      .take(statLimit);
    for (const invoice of invoiceRows) {
      if (invoice.tenantId !== tenantId) continue;
      invoices += 1;
      if (invoice.status === "pending") pendingInvoices += 1;
    }

    const holidayRows = await ctx.db
      .query("holidayRequests")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", membership.clerkId))
      .take(statLimit);
    for (const holiday of holidayRows) {
      if (holiday.tenantId !== tenantId) continue;
      holidays += 1;
      if (holiday.status === "pending") pendingHolidays += 1;
    }

    return { timesheets, pendingTimesheets, invoices, pendingInvoices, holidays, pendingHolidays };
  },
});

const homeLimit = 200;
const teamPreview = 3;

// Summarises the signed-in admin's company for the dashboard content.
export const getAdminHome = query({
  args: {
    weekStartMs: v.number(),
    weekEndMs: v.number(),
    month: v.string(),
  },
  returns: v.object({
    jobSites: v.number(),
    pendingTimesheets: v.number(),
    pendingInvoices: v.number(),
    pendingHolidays: v.number(),
    approvedTimesheets: v.number(),
    approvedInvoices: v.number(),
    approvedHolidays: v.number(),
    workerCount: v.number(),
    team: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
        sites: v.string(),
        imageUrl: v.union(v.string(), v.null()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const membership = await requireAdmin(ctx);
    const tenantId = membership.tenantId;
    const window = homeWindow(args.weekStartMs, args.weekEndMs, args.month);

    const jobSites = await ctx.db
      .query("jobSites")
      .withIndex("by_tenant_id_and_name", (q) => q.eq("tenantId", tenantId))
      .take(homeLimit);
    const pendingTimesheets = await ctx.db
      .query("timesheets")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "pending"))
      .take(homeLimit);
    const pendingInvoices = await ctx.db
      .query("workerInvoices")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "pending"))
      .take(homeLimit);
    const pendingHolidays = await ctx.db
      .query("holidayRequests")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "pending"))
      .take(homeLimit);

    const approvedTimesheets = await ctx.db
      .query("timesheets")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "approved"))
      .take(homeLimit);
    const approvedInvoices = await ctx.db
      .query("workerInvoices")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "approved"))
      .take(homeLimit);
    const approvedHolidays = await ctx.db
      .query("holidayRequests")
      .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", tenantId).eq("status", "approved"))
      .take(homeLimit);

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_tenant_id_and_role", (q) => q.eq("tenantId", tenantId).eq("role", "worker"))
      .take(homeLimit);
    const workers = [];
    for (const member of memberships) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", member.clerkId))
        .unique();
      const assignments = await ctx.db
        .query("jobSiteAssignments")
        .withIndex("by_tenant_id_and_clerk_id", (q) =>
          q.eq("tenantId", tenantId).eq("clerkId", member.clerkId),
        )
        .take(20);
      const siteNames = [];
      for (const assignment of assignments) {
        const site = await ctx.db.get(assignment.jobSiteId);
        if (site && site.tenantId === tenantId) siteNames.push(site.name);
      }
      siteNames.sort((a, b) => a.localeCompare(b));
      workers.push({
        name: user?.name || "Worker",
        email: user?.email || member.clerkId,
        sites: siteNames.join(", "),
        imageUrl: user?.imageStorageId ? await ctx.storage.getUrl(user.imageStorageId) : null,
      });
    }
    workers.sort((a, b) => a.name.localeCompare(b.name));

    return {
      jobSites: jobSites.length,
      pendingTimesheets: pendingTimesheets.length,
      pendingInvoices: pendingInvoices.length,
      pendingHolidays: pendingHolidays.length,
      approvedTimesheets: approvedTimesheets.filter((row) =>
        decidedThisWeek(row.updatedAt, window.weekStartMs, window.weekEndMs),
      ).length,
      approvedInvoices: approvedInvoices.filter((row) =>
        decidedThisWeek(row.updatedAt, window.weekStartMs, window.weekEndMs),
      ).length,
      approvedHolidays: approvedHolidays.filter((row) =>
        decidedThisWeek(row.updatedAt, window.weekStartMs, window.weekEndMs),
      ).length,
      workerCount: workers.length,
      team: workers.slice(0, teamPreview),
    };
  },
});

const activityStatus = v.union(
  v.literal("draft"),
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);

const timesheetActivity = v.union(
  v.null(),
  v.object({
    status: activityStatus,
    weekStart: v.string(),
    weekEnd: v.string(),
    jobSiteName: v.string(),
  }),
);

const invoiceActivity = v.union(
  v.null(),
  v.object({
    status: activityStatus,
    invoiceMonth: v.string(),
    jobSiteName: v.string(),
    fileName: v.union(v.string(), v.null()),
  }),
);

const holidayActivity = v.union(
  v.null(),
  v.object({
    status: activityStatus,
    startDate: v.string(),
    endDate: v.string(),
    jobSiteName: v.string(),
  }),
);

// Summarises the signed-in worker's month, sites, and latest submissions.
export const getWorkerHome = query({
  args: {
    month: v.string(),
  },
  returns: v.object({
    sites: v.array(
      v.object({
        jobSiteId: v.id("jobSites"),
        name: v.string(),
        address: v.union(v.string(), v.null()),
      }),
    ),
    hoursLogged: v.number(),
    invoicesSubmitted: v.number(),
    holidayDays: v.number(),
    timesheet: timesheetActivity,
    invoice: invoiceActivity,
    holiday: holidayActivity,
  }),
  handler: async (ctx, args) => {
    const membership = await requireWorker(ctx);
    const tenantId = membership.tenantId;
    const window = monthWindow(args.month);
    const assignments = await ctx.db
      .query("jobSiteAssignments")
      .withIndex("by_tenant_id_and_clerk_id", (q) =>
        q.eq("tenantId", tenantId).eq("clerkId", membership.clerkId),
      )
      .take(homeLimit);
    const sites = [];
    for (const assignment of assignments) {
      const site = await ctx.db.get(assignment.jobSiteId);
      if (site && site.tenantId === tenantId) {
        sites.push({ jobSiteId: site._id, name: site.name, address: site.address ?? null });
      }
    }
    sites.sort((a, b) => a.name.localeCompare(b.name));

    const timesheets = await ctx.db
      .query("timesheets")
      .withIndex("by_clerk_id_and_week_start", (q) => q.eq("clerkId", membership.clerkId))
      .order("desc")
      .take(homeLimit);
    let hoursLogged = 0;
    let latestTimesheet: Doc<"timesheets"> | null = null;
    for (const timesheet of timesheets) {
      if (timesheet.tenantId !== tenantId) continue;
      if (!latestTimesheet || timesheet.updatedAt >= latestTimesheet.updatedAt) latestTimesheet = timesheet;
      if (timesheet.status !== "rejected") {
        hoursLogged += hoursInMonth(timesheet.hours, timesheet.weekStart, window.month);
      }
    }

    const invoices = await ctx.db
      .query("workerInvoices")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", membership.clerkId))
      .order("desc")
      .take(homeLimit);
    let invoicesSubmitted = 0;
    let latestInvoice: Doc<"workerInvoices"> | null = null;
    for (const invoice of invoices) {
      if (invoice.tenantId !== tenantId) continue;
      if (!latestInvoice || invoice.updatedAt >= latestInvoice.updatedAt) latestInvoice = invoice;
      if (invoice.invoiceMonth === window.month && invoice.status !== "draft" && invoice.status !== "rejected") {
        invoicesSubmitted += 1;
      }
    }

    const holidays = await ctx.db
      .query("holidayRequests")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", membership.clerkId))
      .order("desc")
      .take(homeLimit);
    let holidayDays = 0;
    let latestHoliday: Doc<"holidayRequests"> | null = null;
    for (const holiday of holidays) {
      if (holiday.tenantId !== tenantId) continue;
      if (!latestHoliday || holiday.updatedAt >= latestHoliday.updatedAt) latestHoliday = holiday;
      if (holiday.status === "approved") {
        holidayDays += daysInsideMonth(holiday.startDate, holiday.endDate, window.monthStart, window.monthEnd);
      }
    }

    return {
      sites,
      hoursLogged,
      invoicesSubmitted,
      holidayDays,
      timesheet: latestTimesheet
        ? {
            status: latestTimesheet.status,
            weekStart: latestTimesheet.weekStart,
            weekEnd: latestTimesheet.weekEnd,
            jobSiteName: await jobSiteLabel(ctx, tenantId, latestTimesheet.jobSiteId),
          }
        : null,
      invoice: latestInvoice
        ? {
            status: latestInvoice.status,
            invoiceMonth: latestInvoice.invoiceMonth,
            jobSiteName: await jobSiteLabel(ctx, tenantId, latestInvoice.jobSiteId),
            fileName: latestInvoice.fileName?.trim() || latestInvoice.invoiceFiles?.[0]?.fileName?.trim() || null,
          }
        : null,
      holiday: latestHoliday
        ? {
            status: latestHoliday.status,
            startDate: latestHoliday.startDate,
            endDate: latestHoliday.endDate,
            jobSiteName: await jobSiteLabel(ctx, tenantId, latestHoliday.jobSiteId),
          }
        : null,
    };
  },
});
