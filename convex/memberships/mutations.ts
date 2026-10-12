import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../lib";

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

    await ctx.db.delete(worker._id);
    return null;
  },
});
