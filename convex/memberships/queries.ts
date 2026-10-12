import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib";

const workerLimit = 100;

// Lists workers who have joined the signed-in admin's company.
export const listWorkers = query({
  args: {},
  returns: v.array(
    v.object({
      membershipId: v.id("memberships"),
      name: v.string(),
      email: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const membership = await requireAdmin(ctx);
    const workers = await ctx.db
      .query("memberships")
      .withIndex("by_tenant_id_and_role", (q) =>
        q.eq("tenantId", membership.tenantId).eq("role", "worker"),
      )
      .take(workerLimit);

    const rows = [];
    for (const worker of workers) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", worker.clerkId))
        .unique();
      rows.push({
        membershipId: worker._id,
        name: user?.name || "Worker",
        email: user?.email || "",
      });
    }

    return rows.sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));
  },
});
