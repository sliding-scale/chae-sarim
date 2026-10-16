import { v } from "convex/values";
import { renameSignedInUser, setSignedInProfileImage, syncClerkUser } from "../lib";
import { internalMutation, mutation } from "../_generated/server";

// Creates or updates a user from a verified Clerk webhook, then matches an invite or opens a new company.
export const createOrUpdateFromClerk = internalMutation({
  args: { clerkId: v.string(), email: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    await syncClerkUser(ctx, args);
  },
});

// Opens a company membership for the signed-in person when the webhook has not created one yet.
export const ensureWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    await syncClerkUser(ctx, {
      clerkId: identity.subject,
      email: identity.email ?? "",
      name: identity.name || "Member",
    });
  },
});

// Gives the signed-in person a short-lived URL for uploading a profile photo.
export const generateProfileImageUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return await ctx.storage.generateUploadUrl();
  },
});

// Stores or removes the signed-in person's profile photo.
export const setProfileImage = mutation({
  args: { imageStorageId: v.union(v.id("_storage"), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await setSignedInProfileImage(ctx, args.imageStorageId);
    return null;
  },
});

// Stores the signed-in person's display name after they edit it on their profile.
export const updateProfileName = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await renameSignedInUser(ctx, args.name);
    return null;
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
    if (existing) {
      if (existing.imageStorageId) await ctx.storage.delete(existing.imageStorageId);
      await ctx.db.delete(existing._id);
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (membership) await ctx.db.delete(membership._id);
  },
});
