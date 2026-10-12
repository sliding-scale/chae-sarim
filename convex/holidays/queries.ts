import { v } from "convex/values";
import { query } from "../_generated/server";
import { jobSiteLabel, requireAdmin, requireWorker, workerLabel } from "../lib";

const holidayLimit = 50;

const holidayRow = v.object({
  holidayRequestId: v.id("holidayRequests"),
  workerName: v.string(),
  workerEmail: v.string(),
  jobSiteName: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  reason: v.string(),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  rejectionReason: v.union(v.string(), v.null()),
  updatedAt: v.number(),
});

// Lists submitted holiday requests for the signed-in admin's company, newest first.
export const listHolidays = query({
  args: {},
  returns: v.object({
    pending: v.array(holidayRow),
    reviewed: v.array(holidayRow),
  }),
  handler: async (ctx) => {
    const membership = await requireAdmin(ctx);
    const pending = [];
    const reviewed = [];

    for (const status of ["pending", "approved", "rejected"] as const) {
      const matches = await ctx.db
        .query("holidayRequests")
        .withIndex("by_tenant_id_and_status", (q) =>
          q.eq("tenantId", membership.tenantId).eq("status", status),
        )
        .order("desc")
        .take(holidayLimit);

      for (const holiday of matches) {
        const worker = await workerLabel(ctx, holiday.clerkId);
        const row = {
          holidayRequestId: holiday._id,
          workerName: worker.name,
          workerEmail: worker.email,
          jobSiteName: await jobSiteLabel(ctx, membership.tenantId, holiday.jobSiteId),
          startDate: holiday.startDate,
          endDate: holiday.endDate,
          reason: holiday.reason,
          status,
          rejectionReason: holiday.rejectionReason?.trim() || null,
          updatedAt: holiday.updatedAt,
        };
        if (status === "pending") pending.push(row);
        else reviewed.push(row);
      }
    }

    reviewed.sort((a, b) => b.updatedAt - a.updatedAt);
    return { pending, reviewed };
  },
});

const myHolidayRow = v.object({
  holidayRequestId: v.id("holidayRequests"),
  jobSiteId: v.id("jobSites"),
  jobSiteName: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  reason: v.string(),
  status: v.union(v.literal("draft"), v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  rejectionReason: v.union(v.string(), v.null()),
  updatedAt: v.number(),
});

// Lists holiday requests the signed-in worker submitted, newest first.
export const listMyHolidays = query({
  args: {},
  returns: v.array(myHolidayRow),
  handler: async (ctx) => {
    const membership = await requireWorker(ctx);
    const holidays = await ctx.db
      .query("holidayRequests")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", membership.clerkId))
      .order("desc")
      .take(holidayLimit);

    const rows = [];
    for (const holiday of holidays) {
      if (holiday.tenantId !== membership.tenantId) continue;
      rows.push({
        holidayRequestId: holiday._id,
        jobSiteId: holiday.jobSiteId,
        jobSiteName: await jobSiteLabel(ctx, membership.tenantId, holiday.jobSiteId),
        startDate: holiday.startDate,
        endDate: holiday.endDate,
        reason: holiday.reason,
        status: holiday.status,
        rejectionReason: holiday.rejectionReason?.trim() || null,
        updatedAt: holiday.updatedAt,
      });
    }
    return rows;
  },
});
