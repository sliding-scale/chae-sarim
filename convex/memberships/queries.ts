import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib";

const workerLimit = 100;
const assignmentLimit = 100;

// Lists workers who have joined the signed-in admin's company.
export const listWorkers = query({
  args: {},
  returns: v.array(
    v.object({
      membershipId: v.id("memberships"),
      name: v.string(),
      email: v.string(),
      jobSites: v.array(
        v.object({
          jobSiteId: v.id("jobSites"),
          name: v.string(),
        }),
      ),
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
      const assignments = await ctx.db
        .query("jobSiteAssignments")
        .withIndex("by_tenant_id_and_clerk_id", (q) =>
          q.eq("tenantId", membership.tenantId).eq("clerkId", worker.clerkId),
        )
        .take(assignmentLimit);
      const jobSites = [];
      for (const assignment of assignments) {
        const site = await ctx.db.get(assignment.jobSiteId);
        if (!site || site.tenantId !== membership.tenantId) continue;
        jobSites.push({ jobSiteId: site._id, name: site.name });
      }
      jobSites.sort((a, b) => a.name.localeCompare(b.name));
      rows.push({
        membershipId: worker._id,
        name: user?.name || "Worker",
        email: user?.email || "",
        jobSites,
      });
    }

    return rows.sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));
  },
});
