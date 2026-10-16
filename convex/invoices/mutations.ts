import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  invoiceAmount,
  invoiceMonth,
  requireAdmin,
  requireInvoiceFile,
  requireAssignedJobSite,
  requirePendingInvoice,
  requireWorker,
  notifyAdminsOfSubmission,
  notifyWorkerOfDecision,
  rejectionReason,
} from "../lib";

// Gives the signed-in worker a short-lived URL for uploading an invoice file.
export const generateInvoiceUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireWorker(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

const invoiceFileLimit = 10;

// Stores an invoice the signed-in worker uploaded for one job site.
export const submitInvoice = mutation({
  args: {
    jobSiteId: v.id("jobSites"),
    invoiceMonth: v.string(),
    amount: v.optional(v.number()),
    files: v.array(
      v.object({
        fileStorageId: v.id("_storage"),
        fileName: v.optional(v.string()),
      }),
    ),
  },
  returns: v.id("workerInvoices"),
  handler: async (ctx, args) => {
    const worker = await requireWorker(ctx);
    await requireAssignedJobSite(ctx, worker.tenantId, worker.clerkId, args.jobSiteId);
    const month = invoiceMonth(args.invoiceMonth);
    const amount = invoiceAmount(args.amount);
    if (args.files.length < 1 || args.files.length > invoiceFileLimit) {
      throw new ConvexError("Upload between 1 and 10 files.");
    }

    const files = [];
    for (const file of args.files) {
      files.push(await requireInvoiceFile(ctx, file.fileStorageId, file.fileName));
    }
    const primary = files[0];

    const invoiceId = await ctx.db.insert("workerInvoices", {
      tenantId: worker.tenantId,
      clerkId: worker.clerkId,
      fileStorageId: primary.fileStorageId,
      fileName: primary.fileName,
      invoiceFiles: files,
      invoiceMonth: month,
      jobSiteId: args.jobSiteId,
      ...(amount === undefined ? {} : { amount }),
      status: "pending",
      updatedAt: Date.now(),
    });
    await notifyAdminsOfSubmission(ctx, worker.tenantId, worker.clerkId, "invoice", invoiceId);
    return invoiceId;
  },
});

// Approves or rejects a pending invoice in the signed-in admin's company.
export const decideInvoice = mutation({
  args: {
    invoiceId: v.id("workerInvoices"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const invoice = await requirePendingInvoice(ctx, admin.tenantId, args.invoiceId);
    const reason = args.status === "rejected" ? rejectionReason(args.rejectionReason) : "";
    await ctx.db.patch(invoice._id, { status: args.status, rejectionReason: reason, updatedAt: Date.now() });
    await notifyWorkerOfDecision(ctx, admin.tenantId, invoice.clerkId, "invoice", args.status, reason);
    return null;
  },
});
