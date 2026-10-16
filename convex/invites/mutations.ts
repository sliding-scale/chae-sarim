import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { normalizeEmail, notifyAdminsOfInvite, requireAdmin } from "../lib";

const accountLookupLimit = 5;

// Reserves a worker invite for the signed-in admin's company.
export const reserveInvite = internalMutation({
  args: { email: v.string() },
  returns: v.object({
    inviteId: v.id("invites"),
    tenantName: v.string(),
  }),
  handler: async (ctx, args) => {
    const membership = await requireAdmin(ctx);
    const email = normalizeEmail(args.email);

    const accounts = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(accountLookupLimit);
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
      throw new ConvexError("That email can't be invited.");
    }

    const existing = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      if (existing.tenantId === membership.tenantId) {
        throw new ConvexError("That email already has a pending invite.");
      }
      throw new ConvexError("That email can't be invited.");
    }

    const tenant = await ctx.db.get(membership.tenantId);
    const inviteId = await ctx.db.insert("invites", {
      email,
      tenantId: membership.tenantId,
      role: "worker",
    });
    return {
      inviteId,
      tenantName: tenant?.name ?? "your company",
    };
  },
});

// Stores the Clerk invitation id on an invite that is still pending.
export const attachInvitationId = internalMutation({
  args: { inviteId: v.id("invites"), clerkInvitationId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireAdmin(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.tenantId !== membership.tenantId) return null;
    await ctx.db.patch(invite._id, { clerkInvitationId: args.clerkInvitationId });
    await notifyAdminsOfInvite(ctx, invite.tenantId, invite.email, invite._id);
    return null;
  },
});

// Deletes an invite that is still pending for the signed-in admin's company.
export const releaseInvite = internalMutation({
  args: { inviteId: v.id("invites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireAdmin(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.tenantId !== membership.tenantId) return null;
    await ctx.db.delete(invite._id);
    return null;
  },
});

// Deletes a pending invite after its Clerk user has been removed.
export const deleteInviteByEmail = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireAdmin(ctx);
    const email = normalizeEmail(args.email);
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!invite || invite.tenantId !== membership.tenantId) return null;
    await ctx.db.delete(invite._id);
    return null;
  },
});
