import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { deleteWorkerAssignments, requireAdmin, requireJobSite } from "../lib";

// Removes a worker membership from the signed-in admin's company.
export const removeWorker = mutation({
  args: { membershipId: v.id("memberships") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const worker = await ctx.db.get(args.membershipId);
    if (!worker || worker.tenantId !== admin.tenantId || worker.role !== "worker") {
      throw new ConvexError("That worker is not in this company.");
    }

    await deleteWorkerAssignments(ctx, worker.tenantId, worker.clerkId);
    await ctx.db.delete(worker._id);
    return null;
  },
});

const assignmentLimit = 50;

// Replaces the job sites assigned to one worker in the signed-in admin's company.
export const setWorkerJobSites = mutation({
  args: {
    membershipId: v.id("memberships"),
    jobSiteIds: v.array(v.id("jobSites")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const worker = await ctx.db.get(args.membershipId);
    if (!worker || worker.tenantId !== admin.tenantId || worker.role !== "worker") {
      throw new ConvexError("That worker is not in this company.");
    }
    if (args.jobSiteIds.length > assignmentLimit) {
      throw new ConvexError("Assign 50 job sites or fewer.");
    }

    const uniqueIds = [...new Set(args.jobSiteIds)];
    for (const jobSiteId of uniqueIds) {
      await requireJobSite(ctx, admin.tenantId, jobSiteId);
    }

    await deleteWorkerAssignments(ctx, worker.tenantId, worker.clerkId);
    for (const jobSiteId of uniqueIds) {
      await ctx.db.insert("jobSiteAssignments", {
        tenantId: admin.tenantId,
        clerkId: worker.clerkId,
        jobSiteId,
      });
    }
    return null;
  },
});
