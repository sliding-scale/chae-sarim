import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  hoursValidator,
  requireAdmin,
  requireJobSite,
  requirePendingTimesheet,
  requireWorker,
  rejectionReason,
  timesheetComments,
  timesheetHours,
  notifyAdminsOfSubmission,
  notifyWorkerOfDecision,
  weekRange,
} from "../lib";

// Approves or rejects a pending timesheet in the signed-in admin's company.
export const decideTimesheet = mutation({
  args: {
    timesheetId: v.id("timesheets"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const timesheet = await requirePendingTimesheet(ctx, admin.tenantId, args.timesheetId);
    const reason = args.status === "rejected" ? rejectionReason(args.rejectionReason) : "";
    await ctx.db.patch(timesheet._id, { status: args.status, rejectionReason: reason, updatedAt: Date.now() });
    await notifyWorkerOfDecision(ctx, admin.tenantId, timesheet.clerkId, "timesheet", args.status, reason);
    return null;
  },
});

const weekMatchLimit = 50;

// Submits weekly hours for one job site in the signed-in worker's company.
export const submitTimesheet = mutation({
  args: {
    jobSiteId: v.id("jobSites"),
    weekStart: v.string(),
    comments: v.optional(v.string()),
    hours: hoursValidator,
  },
  returns: v.id("timesheets"),
  handler: async (ctx, args) => {
    const worker = await requireWorker(ctx);
    await requireJobSite(ctx, worker.tenantId, args.jobSiteId);
    const week = weekRange(args.weekStart);
    const hours = timesheetHours(args.hours);
    const comments = timesheetComments(args.comments);
    const now = Date.now();

    const matches = await ctx.db
      .query("timesheets")
      .withIndex("by_clerk_id_and_week_start", (q) =>
        q.eq("clerkId", worker.clerkId).eq("weekStart", week.weekStart),
      )
      .take(weekMatchLimit);
    const existing = matches.find(
      (timesheet) => timesheet.tenantId === worker.tenantId && timesheet.jobSiteId === args.jobSiteId,
    );

    if (existing?.status === "approved") {
      throw new ConvexError("That week is already approved for this job site.");
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        weekEnd: week.weekEnd,
        comments,
        hours,
        status: "pending",
        rejectionReason: "",
        updatedAt: now,
      });
      await notifyAdminsOfSubmission(ctx, worker.tenantId, worker.clerkId, "timesheet", existing._id);
      return existing._id;
    }

    const timesheetId = await ctx.db.insert("timesheets", {
      tenantId: worker.tenantId,
      clerkId: worker.clerkId,
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      jobSiteId: args.jobSiteId,
      comments,
      hours,
      status: "pending",
      updatedAt: now,
    });
    await notifyAdminsOfSubmission(ctx, worker.tenantId, worker.clerkId, "timesheet", timesheetId);
    return timesheetId;
  },
});
