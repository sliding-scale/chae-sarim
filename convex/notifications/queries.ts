import { v } from "convex/values";
import { query } from "../_generated/server";
import { activityLine, requireMembership } from "../lib";

const notificationLimit = 30;

// Lists notifications for the signed-in person, newest first.
export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      notificationId: v.id("notifications"),
      actor: v.string(),
      action: v.string(),
      imageUrl: v.union(v.string(), v.null()),
      href: v.string(),
      read: v.boolean(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const membership = await requireMembership(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_clerk_id", (q) => q.eq("recipientClerkId", membership.clerkId))
      .order("desc")
      .take(notificationLimit);

    const rows = notifications.filter((notification) => notification.tenantId === membership.tenantId);
    return await Promise.all(
      rows.map(async (notification) => {
        const line = await activityLine(ctx, notification);
        return {
          notificationId: notification._id,
          actor: line.actor,
          action: line.action,
          imageUrl: line.imageUrl,
          href: notification.href,
          read: notification.read,
          createdAt: notification.createdAt,
        };
      }),
    );
  },
});
