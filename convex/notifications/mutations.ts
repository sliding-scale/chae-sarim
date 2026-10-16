import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  notifyAdminsOfInvite,
  notifyAdminsOfJoin,
  notifyAdminsOfSubmission,
  requireAdmin,
  requireMembership,
} from "../lib";

const pendingLimit = 50;
const noticeLimit = 100;
const sameSubmissionMs = 60_000;

// Marks one of the signed-in person's notifications as read.
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireMembership(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (
      !notification ||
      notification.tenantId !== membership.tenantId ||
      notification.recipientClerkId !== membership.clerkId
    ) {
      throw new ConvexError("That notification is not yours.");
    }
    if (!notification.read) await ctx.db.patch(notification._id, { read: true });
    return null;
  },
});

// Creates notifications for workers, invites, and pending submissions that were missed.
export const catchUpPending = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    const [timesheets, invoices, holidays, notices, workers, invites] = await Promise.all([
      ctx.db
        .query("timesheets")
        .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", admin.tenantId).eq("status", "pending"))
        .take(pendingLimit),
      ctx.db
        .query("workerInvoices")
        .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", admin.tenantId).eq("status", "pending"))
        .take(pendingLimit),
      ctx.db
        .query("holidayRequests")
        .withIndex("by_tenant_id_and_status", (q) => q.eq("tenantId", admin.tenantId).eq("status", "pending"))
        .take(pendingLimit),
      ctx.db
        .query("notifications")
        .withIndex("by_recipient_clerk_id", (q) => q.eq("recipientClerkId", admin.clerkId))
        .order("desc")
        .take(noticeLimit),
      ctx.db
        .query("memberships")
        .withIndex("by_tenant_id_and_role", (q) => q.eq("tenantId", admin.tenantId).eq("role", "worker"))
        .take(pendingLimit),
      ctx.db
        .query("invites")
        .withIndex("by_tenant_id", (q) => q.eq("tenantId", admin.tenantId))
        .take(pendingLimit),
    ]);

    const pending = [
      ...timesheets.map((row) => ({ sourceId: row._id, clerkId: row.clerkId, kind: "timesheet" as const, updatedAt: row.updatedAt })),
      ...invoices.map((row) => ({ sourceId: row._id, clerkId: row.clerkId, kind: "invoice" as const, updatedAt: row.updatedAt })),
      ...holidays.map((row) => ({ sourceId: row._id, clerkId: row.clerkId, kind: "holiday" as const, updatedAt: row.updatedAt })),
    ];
    const mine = notices.filter((notice) => notice.tenantId === admin.tenantId);
    const seen = new Set(mine.flatMap((notice) => (notice.sourceId ? [notice.sourceId] : [])));

    for (const item of pending) {
      const linked = mine.find((notice) => notice.sourceId === item.sourceId);
      if (linked) continue;
      const earlier = mine.find(
        (notice) =>
          !notice.sourceId &&
          notice.kind === item.kind &&
          notice.title.endsWith("to review") &&
          Math.abs(notice.createdAt - item.updatedAt) < sameSubmissionMs,
      );
      if (earlier) {
        await ctx.db.patch(earlier._id, { sourceId: item.sourceId });
        earlier.sourceId = item.sourceId;
        continue;
      }
      await notifyAdminsOfSubmission(ctx, admin.tenantId, item.clerkId, item.kind, item.sourceId);
      seen.add(item.sourceId);
    }

    for (const worker of workers) {
      const sourceId = worker._id;
      if (seen.has(sourceId)) continue;
      await notifyAdminsOfJoin(ctx, admin.tenantId, worker.clerkId, sourceId, worker._creationTime);
      seen.add(sourceId);
    }

    for (const invite of invites) {
      const sourceId = invite._id;
      if (seen.has(sourceId)) continue;
      await notifyAdminsOfInvite(ctx, admin.tenantId, invite.email, sourceId, invite._creationTime);
      seen.add(sourceId);
    }
    return null;
  },
});
