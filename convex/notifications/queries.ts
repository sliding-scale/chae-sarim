import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireMembership } from "../lib";

const notificationLimit = 30;

// Lists notifications for the signed-in person, newest first.
export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      notificationId: v.id("notifications"),
      title: v.string(),
      body: v.string(),
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

    return notifications
      .filter((notification) => notification.tenantId === membership.tenantId)
      .map((notification) => ({
        notificationId: notification._id,
        title: notification.title,
        body: notification.body,
        href: notification.href,
        read: notification.read,
        createdAt: notification.createdAt,
      }));
  },
});
