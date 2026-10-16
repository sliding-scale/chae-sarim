import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib";

// Returns the company details the signed-in admin is allowed to edit.
export const getCompany = query({
  args: {},
  returns: v.object({
    name: v.string(),
    address: v.union(v.string(), v.null()),
    phone: v.union(v.string(), v.null()),
    contactEmail: v.union(v.string(), v.null()),
    imageUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const membership = await requireAdmin(ctx);
    const tenant = await ctx.db.get(membership.tenantId);
    if (!tenant) throw new ConvexError("Your company is still being created.");
    return {
      name: tenant.name,
      address: tenant.address ?? null,
      phone: tenant.phone ?? null,
      contactEmail: tenant.contactEmail ?? null,
      imageUrl: tenant.imageStorageId ? await ctx.storage.getUrl(tenant.imageStorageId) : null,
    };
  },
});
