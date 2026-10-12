import { v } from "convex/values";
import { query } from "../_generated/server";
import { invoiceFileLinks, jobSiteLabel, requireAdmin, requireWorker, workerLabel } from "../lib";

const invoiceLimit = 50;

const invoiceFile = v.object({
  fileName: v.string(),
  url: v.union(v.string(), v.null()),
});

const invoiceRow = v.object({
  invoiceId: v.id("workerInvoices"),
  workerName: v.string(),
  workerEmail: v.string(),
  jobSiteName: v.string(),
  invoiceMonth: v.string(),
  amount: v.union(v.number(), v.null()),
  files: v.array(invoiceFile),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  rejectionReason: v.union(v.string(), v.null()),
  updatedAt: v.number(),
});

// Lists submitted invoices for the signed-in admin's company, newest first.
export const listInvoices = query({
  args: {},
  returns: v.object({
    pending: v.array(invoiceRow),
    reviewed: v.array(invoiceRow),
  }),
  handler: async (ctx) => {
    const membership = await requireAdmin(ctx);
    const pending = [];
    const reviewed = [];

    for (const status of ["pending", "approved", "rejected"] as const) {
      const matches = await ctx.db
        .query("workerInvoices")
        .withIndex("by_tenant_id_and_status", (q) =>
          q.eq("tenantId", membership.tenantId).eq("status", status),
        )
        .order("desc")
        .take(invoiceLimit);

      for (const invoice of matches) {
        const worker = await workerLabel(ctx, invoice.clerkId);
        const row = {
          invoiceId: invoice._id,
          workerName: worker.name,
          workerEmail: worker.email,
          jobSiteName: await jobSiteLabel(ctx, membership.tenantId, invoice.jobSiteId),
          invoiceMonth: invoice.invoiceMonth,
          amount: invoice.amount ?? null,
          files: await invoiceFileLinks(ctx, invoice),
          status,
          rejectionReason: invoice.rejectionReason?.trim() || null,
          updatedAt: invoice.updatedAt,
        };
        if (status === "pending") pending.push(row);
        else reviewed.push(row);
      }
    }

    reviewed.sort((a, b) => b.updatedAt - a.updatedAt);
    return { pending, reviewed };
  },
});

const myInvoiceRow = v.object({
  invoiceId: v.id("workerInvoices"),
  jobSiteId: v.id("jobSites"),
  jobSiteName: v.string(),
  invoiceMonth: v.string(),
  amount: v.union(v.number(), v.null()),
  files: v.array(invoiceFile),
  status: v.union(v.literal("draft"), v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  rejectionReason: v.union(v.string(), v.null()),
  updatedAt: v.number(),
});

// Lists invoices the signed-in worker uploaded, newest first.
export const listMyInvoices = query({
  args: {},
  returns: v.array(myInvoiceRow),
  handler: async (ctx) => {
    const membership = await requireWorker(ctx);
    const invoices = await ctx.db
      .query("workerInvoices")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", membership.clerkId))
      .order("desc")
      .take(invoiceLimit);

    const rows = [];
    for (const invoice of invoices) {
      if (invoice.tenantId !== membership.tenantId) continue;
      rows.push({
        invoiceId: invoice._id,
        jobSiteId: invoice.jobSiteId,
        jobSiteName: await jobSiteLabel(ctx, membership.tenantId, invoice.jobSiteId),
        invoiceMonth: invoice.invoiceMonth,
        amount: invoice.amount ?? null,
        files: await invoiceFileLinks(ctx, invoice),
        status: invoice.status,
        rejectionReason: invoice.rejectionReason?.trim() || null,
        updatedAt: invoice.updatedAt,
      });
    }
    return rows;
  },
});
