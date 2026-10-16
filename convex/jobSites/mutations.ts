import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { assertUniqueName, assertUnused, deleteSiteAssignments, requireAdmin, siteAddress, siteName } from "../lib";

// Adds a job site to the signed-in admin's company.
export const createJobSite = mutation({
  args: { name: v.string(), address: v.string() },
  returns: v.id("jobSites"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const name = siteName(args.name);
    const address = siteAddress(args.address);
    await assertUniqueName(ctx, admin.tenantId, name);

    return await ctx.db.insert(
      "jobSites",
      address ? { tenantId: admin.tenantId, name, address } : { tenantId: admin.tenantId, name },
    );
  },
});

// Changes the name or address of a job site in the signed-in admin's company.
export const updateJobSite = mutation({
  args: { jobSiteId: v.id("jobSites"), name: v.string(), address: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const site = await ctx.db.get(args.jobSiteId);
    if (!site || site.tenantId !== admin.tenantId) {
      throw new ConvexError("That job site is not in this company.");
    }

    const name = siteName(args.name);
    const address = siteAddress(args.address);
    await assertUniqueName(ctx, admin.tenantId, name, site._id);
    await ctx.db.replace(
      site._id,
      address ? { tenantId: site.tenantId, name, address } : { tenantId: site.tenantId, name },
    );
    return null;
  },
});

// Deletes a job site in the signed-in admin's company when nothing still uses it.
export const removeJobSite = mutation({
  args: { jobSiteId: v.id("jobSites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const site = await ctx.db.get(args.jobSiteId);
    if (!site || site.tenantId !== admin.tenantId) {
      throw new ConvexError("That job site is not in this company.");
    }

    await assertUnused(ctx, site._id);
    await deleteSiteAssignments(ctx, site._id);
    await ctx.db.delete(site._id);
    return null;
  },
});
