import { v } from "convex/values";
import { query } from "../_generated/server";

// Returns the signed-in user's name, photo, email, membership role, and company name.
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      name: v.string(),
      email: v.string(),
      role: v.union(v.literal("admin"), v.literal("worker"), v.null()),
      tenantName: v.union(v.string(), v.null()),
      tenantImageUrl: v.union(v.string(), v.null()),
      imageUrl: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkId = identity.subject;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    const tenant = membership ? await ctx.db.get(membership.tenantId) : null;

    return {
      name: user?.name || identity.name || "Member",
      email: user?.email || identity.email || "",
      role: membership?.role ?? null,
      tenantName: tenant?.name ?? null,
      tenantImageUrl: tenant?.imageStorageId ? await ctx.storage.getUrl(tenant.imageStorageId) : null,
      imageUrl: user?.imageStorageId ? await ctx.storage.getUrl(user.imageStorageId) : null,
    };
  },
});
