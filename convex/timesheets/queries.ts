import { v } from "convex/values";
import { query } from "../_generated/server";
import { hoursValidator, jobSiteLabel, requireAdmin, requireWorker, totalHours, workerLabel } from "../lib";

const timesheetLimit = 50;

const timesheetRow = v.object({
  timesheetId: v.id("timesheets"),
  workerName: v.string(),
  workerEmail: v.string(),
  jobSiteName: v.string(),
  weekStart: v.string(),
  weekEnd: v.string(),
  comments: v.union(v.string(), v.null()),
  hours: hoursValidator,
  totalHours: v.number(),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  rejectionReason: v.union(v.string(), v.null()),
  updatedAt: v.number(),
});

// Lists submitted timesheets for the signed-in admin's company, newest first.
export const listTimesheets = query({
  args: {},
  returns: v.object({
    pending: v.array(timesheetRow),
    reviewed: v.array(timesheetRow),
  }),
  handler: async (ctx) => {
    const membership = await requireAdmin(ctx);
    const pending = [];
    const reviewed = [];

    for (const status of ["pending", "approved", "rejected"] as const) {
      const matches = await ctx.db
        .query("timesheets")
        .withIndex("by_tenant_id_and_status", (q) =>
          q.eq("tenantId", membership.tenantId).eq("status", status),
        )
        .order("desc")
        .take(timesheetLimit);

      for (const timesheet of matches) {
        const worker = await workerLabel(ctx, timesheet.clerkId);
        const row = {
          timesheetId: timesheet._id,
          workerName: worker.name,
          workerEmail: worker.email,
          jobSiteName: await jobSiteLabel(ctx, membership.tenantId, timesheet.jobSiteId),
          weekStart: timesheet.weekStart,
          weekEnd: timesheet.weekEnd,
          comments: timesheet.comments ?? null,
          hours: timesheet.hours,
          totalHours: totalHours(timesheet.hours),
          status,
          rejectionReason: timesheet.rejectionReason?.trim() || null,
          updatedAt: timesheet.updatedAt,
        };
        if (status === "pending") pending.push(row);
        else reviewed.push(row);
      }
    }

    reviewed.sort((a, b) => b.updatedAt - a.updatedAt);
    return { pending, reviewed };
  },
});

const myTimesheetRow = v.object({
  timesheetId: v.id("timesheets"),
  jobSiteId: v.id("jobSites"),
  jobSiteName: v.string(),
  weekStart: v.string(),
  weekEnd: v.string(),
  comments: v.union(v.string(), v.null()),
  hours: hoursValidator,
  totalHours: v.number(),
  status: v.union(v.literal("draft"), v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  rejectionReason: v.union(v.string(), v.null()),
  updatedAt: v.number(),
});

// Lists timesheets the signed-in worker submitted, newest week first.
export const listMyTimesheets = query({
  args: {},
  returns: v.array(myTimesheetRow),
  handler: async (ctx) => {
    const membership = await requireWorker(ctx);
    const timesheets = await ctx.db
      .query("timesheets")
      .withIndex("by_clerk_id_and_week_start", (q) => q.eq("clerkId", membership.clerkId))
      .order("desc")
      .take(timesheetLimit);

    const rows = [];
    for (const timesheet of timesheets) {
      if (timesheet.tenantId !== membership.tenantId) continue;
      rows.push({
        timesheetId: timesheet._id,
        jobSiteId: timesheet.jobSiteId,
        jobSiteName: await jobSiteLabel(ctx, membership.tenantId, timesheet.jobSiteId),
        weekStart: timesheet.weekStart,
        weekEnd: timesheet.weekEnd,
        comments: timesheet.comments?.trim() ? timesheet.comments : null,
        hours: timesheet.hours,
        totalHours: totalHours(timesheet.hours),
        status: timesheet.status,
        rejectionReason: timesheet.rejectionReason?.trim() || null,
        updatedAt: timesheet.updatedAt,
      });
    }
    return rows;
  },
});
