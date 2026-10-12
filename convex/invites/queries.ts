import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib";

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
