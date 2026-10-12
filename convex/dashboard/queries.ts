import { v } from "convex/values";
import { query } from "../_generated/server";
import { jobSiteLabel, requireAdmin, requireWorker, workerLabel } from "../lib";

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
