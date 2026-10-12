import { query } from "../_generated/server";

// Returns the signed-in user's name, email, membership role, and company name.
export const getCurrentUser = query({
  args: {},
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
    };
  },
});
