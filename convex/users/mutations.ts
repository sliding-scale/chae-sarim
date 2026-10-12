import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

// Creates or updates a user from a verified Clerk webhook, then matches an invite or opens a new company.
export const createOrUpdateFromClerk = internalMutation({
  args: { clerkId: v.string(), email: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { email, name: args.name });
    } else {
      await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email,
        name: args.name,
      });
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (membership) return;

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (invite) {
      await ctx.db.insert("memberships", {
        clerkId: args.clerkId,
        tenantId: invite.tenantId,
        role: "worker",
      });
      await ctx.db.delete(invite._id);
      return;
    }

    const tenantId = await ctx.db.insert("tenants", {
      name: `${args.name}'s company`,
    });
    await ctx.db.insert("memberships", {
      clerkId: args.clerkId,
      tenantId,
      role: "admin",
    });
  },
});

// Deletes the user and membership after a verified Clerk webhook says the account was deleted.
export const deleteByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (membership) await ctx.db.delete(membership._id);
  },
});
