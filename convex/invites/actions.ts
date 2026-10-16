import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import {
  createClerkInvitation,
  deleteClerkUser,
  normalizeEmail,
  revokeClerkInvitation,
  signUpLink,
} from "../lib";

// Emails a worker invite for the signed-in admin's company.
export const inviteWorker = action({
  args: { email: v.string(), origin: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("You need to sign in.");

    const email = normalizeEmail(args.email);
    const redirectUrl = signUpLink(args.origin);
    const reserved = await ctx.runMutation(internal.invites.mutations.reserveInvite, { email });

    let invitationId: string | null;
    try {
      invitationId = await createClerkInvitation(email, redirectUrl);
    } catch (error) {
      await ctx.runMutation(internal.invites.mutations.releaseInvite, { inviteId: reserved.inviteId });
      throw error;
    }
    if (!invitationId) {
      await ctx.runMutation(internal.invites.mutations.releaseInvite, { inviteId: reserved.inviteId });
      throw new ConvexError("That email can't be invited.");
    }

    try {
      await ctx.runMutation(internal.invites.mutations.attachInvitationId, {
        inviteId: reserved.inviteId,
        clerkInvitationId: invitationId,
      });
    } catch (error) {
      await revokeClerkInvitation(invitationId).catch(() => undefined);
      await ctx.runMutation(internal.invites.mutations.releaseInvite, { inviteId: reserved.inviteId });
      throw error;
    }
    return null;
  },
});

// Cancels a pending worker invite and revokes its Clerk invitation.
export const revokeInvite = action({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("You need to sign in.");

    const invite = await ctx.runQuery(internal.invites.queries.inviteForRevoke, { email: args.email });
    if (invite.clerkInvitationId) await revokeClerkInvitation(invite.clerkInvitationId);
    else if (invite.clerkId) await deleteClerkUser(invite.clerkId);
    await ctx.runMutation(internal.invites.mutations.deleteInviteByEmail, { email: args.email });
    return null;
  },
});
