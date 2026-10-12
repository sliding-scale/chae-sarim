import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { holidayRange, holidayReason, notifyAdminsOfSubmission, notifyWorkerOfDecision, rejectionReason, requireAdmin, requireJobSite, requirePendingHoliday, requireWorker } from "../lib";

// Stores a holiday request from the signed-in worker for one job site.
export const submitHoliday = mutation({
  args: {
    jobSiteId: v.id("jobSites"),
    startDate: v.string(),
    endDate: v.string(),
    reason: v.string(),
  },
  returns: v.id("holidayRequests"),
  handler: async (ctx, args) => {
    const worker = await requireWorker(ctx);
    await requireJobSite(ctx, worker.tenantId, args.jobSiteId);
    const range = holidayRange(args.startDate, args.endDate);
    const holidayId = await ctx.db.insert("holidayRequests", {
      tenantId: worker.tenantId,
      clerkId: worker.clerkId,
      jobSiteId: args.jobSiteId,
      startDate: range.startDate,
      endDate: range.endDate,
      reason: holidayReason(args.reason),
      status: "pending",
      updatedAt: Date.now(),
    });
    await notifyAdminsOfSubmission(ctx, worker.tenantId, worker.clerkId, "holiday", holidayId);
    return holidayId;
  },
});

// Approves or rejects a pending holiday request in the signed-in admin's company.
export const decideHoliday = mutation({
  args: {
    holidayRequestId: v.id("holidayRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const holiday = await requirePendingHoliday(ctx, admin.tenantId, args.holidayRequestId);
    const reason = args.status === "rejected" ? rejectionReason(args.rejectionReason) : "";
    await ctx.db.patch(holiday._id, { status: args.status, rejectionReason: reason, updatedAt: Date.now() });
    await notifyWorkerOfDecision(ctx, admin.tenantId, holiday.clerkId, "holiday", args.status, reason);
    return null;
  },
});
