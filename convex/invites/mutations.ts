import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { normalizeEmail, requireAdmin } from "../lib";

// Stores a pending worker invite for the signed-in admin's company.
export const inviteWorker = mutation({
  args: { email: v.string() },
  returns: v.id("invites"),
  handler: async (ctx, args) => {
    const membership = await requireAdmin(ctx);
    const email = normalizeEmail(args.email);

    const accounts = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(5);
    for (const account of accounts) {
      const existingMembership = await ctx.db
        .query("memberships")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", account.clerkId))
        .unique();
      if (!existingMembership) continue;
      if (existingMembership.tenantId === membership.tenantId) {
        throw new ConvexError(
          existingMembership.role === "admin"
            ? "That email is already the administrator of this company."
            : "That person is already a worker here.",
        );
      }
      throw new ConvexError("That email already belongs to another company.");
    }

    const existing = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      throw new ConvexError(
        existing.tenantId === membership.tenantId
          ? "That email already has a pending invite."
          : "That email already has an invite for another company.",
      );
    }

    return await ctx.db.insert("invites", {
      email,
      tenantId: membership.tenantId,
      role: "worker",
    });
  },
});

// Deletes a pending invite that belongs to the signed-in admin's company.
export const revokeInvite = mutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireAdmin(ctx);
    const email = normalizeEmail(args.email);
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!invite || invite.tenantId !== membership.tenantId) {
      throw new ConvexError("That invite is not pending for this company.");
    }

    await ctx.db.delete(invite._id);
    return null;
  },
});
