import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin, requireWorker, workerLabel } from "../lib";

const jobSiteLimit = 100;

// Lists job sites for the signed-in admin's company.
export const listJobSites = query({
  args: {},
  returns: v.array(
    v.object({
      jobSiteId: v.id("jobSites"),
      name: v.string(),
      address: v.union(v.string(), v.null()),
      workers: v.array(v.object({ name: v.string() })),
    }),
  ),
  handler: async (ctx) => {
    const membership = await requireAdmin(ctx);
    const sites = await ctx.db
      .query("jobSites")
      .withIndex("by_tenant_id_and_name", (q) => q.eq("tenantId", membership.tenantId))
      .take(jobSiteLimit);

    const rows = [];
    for (const site of sites) {
      const assignments = await ctx.db
        .query("jobSiteAssignments")
        .withIndex("by_job_site_id", (q) => q.eq("jobSiteId", site._id))
        .take(jobSiteLimit);
      const workers = [];
      for (const assignment of assignments) {
        if (assignment.tenantId !== membership.tenantId) continue;
        const worker = await workerLabel(ctx, assignment.clerkId);
        workers.push({ name: worker.name });
      }
      workers.sort((a, b) => a.name.localeCompare(b.name));
      rows.push({
        jobSiteId: site._id,
        name: site.name,
        address: site.address ?? null,
        workers,
      });
    }
    return rows;
  },
});

// Lists job sites the signed-in worker can submit time against.
export const listWorkerJobSites = query({
  args: {},
  returns: v.array(
    v.object({
      jobSiteId: v.id("jobSites"),
      name: v.string(),
      address: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const membership = await requireWorker(ctx);
    const assignments = await ctx.db
      .query("jobSiteAssignments")
      .withIndex("by_tenant_id_and_clerk_id", (q) =>
        q.eq("tenantId", membership.tenantId).eq("clerkId", membership.clerkId),
      )
      .take(jobSiteLimit);

    const sites = [];
    for (const assignment of assignments) {
      const site = await ctx.db.get(assignment.jobSiteId);
      if (!site || site.tenantId !== membership.tenantId) continue;
      sites.push({
        jobSiteId: site._id,
        name: site.name,
        address: site.address ?? null,
      });
    }
    return sites.sort((a, b) => a.name.localeCompare(b.name));
  },
});
