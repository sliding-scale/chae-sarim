import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { listSampleInvoiceFileNames, listSarimInvoiceFileNames, seedSampleActivity, seedSampleRoster, storeSamplePdf } from "./lib";

// Inserts 20 sample workers and 15 sample job sites into the only company.
export const sampleRoster = internalMutation({
  args: {},
  returns: v.object({
    workersAdded: v.number(),
    jobSitesAdded: v.number(),
  }),
  handler: async (ctx) => {
    return await seedSampleRoster(ctx);
  },
});

// Writes the sample assignments, timesheets, invoices, and holiday requests.
export const writeSampleActivity = internalMutation({
  args: {
    files: v.array(
      v.object({
        fileName: v.string(),
        fileStorageId: v.id("_storage"),
      }),
    ),
  },
  returns: v.object({
    assignmentsAdded: v.number(),
    timesheetsAdded: v.number(),
    invoicesAdded: v.number(),
    holidaysAdded: v.number(),
  }),
  handler: async (ctx, args) => {
    return await seedSampleActivity(ctx, args.files);
  },
});

// Stores sample invoice PDFs, then writes the review records for the company.
export const sampleActivity = internalAction({
  args: {},
  returns: v.object({
    assignmentsAdded: v.number(),
    timesheetsAdded: v.number(),
    invoicesAdded: v.number(),
    holidaysAdded: v.number(),
  }),
  handler: async (ctx): Promise<{
    assignmentsAdded: number;
    timesheetsAdded: number;
    invoicesAdded: number;
    holidaysAdded: number;
  }> => {
    const files = [];
    for (const fileName of listSampleInvoiceFileNames()) {
      const fileStorageId = await storeSamplePdf(ctx, fileName.replace(/\.pdf$/, ""));
      files.push({ fileName, fileStorageId });
    }
    return await ctx.runMutation(internal.seed.writeSampleActivity, { files });
  },
});

// Stores Sarim YT's invoice PDFs, then writes that worker's review records.
export const sarimActivity = internalAction({
  args: {},
  returns: v.object({
    assignmentsAdded: v.number(),
    timesheetsAdded: v.number(),
    invoicesAdded: v.number(),
    holidaysAdded: v.number(),
  }),
  handler: async (ctx): Promise<{
    assignmentsAdded: number;
    timesheetsAdded: number;
    invoicesAdded: number;
    holidaysAdded: number;
  }> => {
    const files = [];
    for (const fileName of listSarimInvoiceFileNames()) {
      const fileStorageId = await storeSamplePdf(ctx, fileName.replace(/\.pdf$/, ""));
      files.push({ fileName, fileStorageId });
    }
    return await ctx.runMutation(internal.seed.writeSampleActivity, { files });
  },
});
