import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin, requireWorker } from "../lib";

const jobSiteLimit = 100;

// Lists job sites for the signed-in admin's company.
export const listJobSites = query({
  args: {},
  returns: v.array(
    v.object({
      jobSiteId: v.id("jobSites"),
      name: v.string(),
      address: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const membership = await requireAdmin(ctx);
    const sites = await ctx.db
      .query("jobSites")
      .withIndex("by_tenant_id_and_name", (q) => q.eq("tenantId", membership.tenantId))
      .take(jobSiteLimit);

    return sites.map((site) => ({
      jobSiteId: site._id,
      name: site.name,
      address: site.address ?? null,
    }));
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
    const sites = await ctx.db
      .query("jobSites")
      .withIndex("by_tenant_id_and_name", (q) => q.eq("tenantId", membership.tenantId))
      .take(jobSiteLimit);

    return sites.map((site) => ({
      jobSiteId: site._id,
      name: site.name,
      address: site.address ?? null,
    }));
  },
});
