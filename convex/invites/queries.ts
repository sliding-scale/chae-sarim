import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { normalizeEmail, requireAdmin } from "../lib";

const pendingInviteLimit = 100;

// Lists pending worker invites for the signed-in admin's company.
export const listPending = query({
  args: {},
  returns: v.array(
    v.object({
      email: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const membership = await requireAdmin(ctx);
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_tenant_id", (q) => q.eq("tenantId", membership.tenantId))
      .take(pendingInviteLimit);

    return invites
      .map((invite) => ({ email: invite.email }))
      .sort((a, b) => a.email.localeCompare(b.email));
  },
});

// Returns the Clerk ids stored on a pending invite for the signed-in admin's company.
export const inviteForRevoke = internalQuery({
  args: { email: v.string() },
  returns: v.object({
    clerkId: v.union(v.string(), v.null()),
    clerkInvitationId: v.union(v.string(), v.null()),
  }),
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
    return {
      clerkId: invite.clerkId ?? null,
      clerkInvitationId: invite.clerkInvitationId ?? null,
    };
  },
});
