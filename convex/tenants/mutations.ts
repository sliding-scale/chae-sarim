import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  companyAddress,
  companyContactEmail,
  companyName,
  companyPhone,
  requireAdmin,
  requireCompanyImage,
} from "../lib";

// Updates the signed-in admin's company name and contact details.
export const updateCompany = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    phone: v.string(),
    contactEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireAdmin(ctx);
    const tenant = await ctx.db.get(membership.tenantId);
    if (!tenant) throw new ConvexError("Your company is still being created.");

    const name = companyName(args.name);
    const address = companyAddress(args.address);
    const phone = companyPhone(args.phone);
    const contactEmail = companyContactEmail(args.contactEmail);
    await ctx.db.replace(tenant._id, {
      name,
      ...(address ? { address } : {}),
      ...(phone ? { phone } : {}),
      ...(contactEmail ? { contactEmail } : {}),
      ...(tenant.imageStorageId ? { imageStorageId: tenant.imageStorageId } : {}),
    });
    return null;
  },
});

// Gives the signed-in admin a short-lived URL for uploading a company photo.
export const generateCompanyImageUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Stores or removes the signed-in admin's company photo.
export const setCompanyImage = mutation({
  args: { imageStorageId: v.union(v.id("_storage"), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireAdmin(ctx);
    const tenant = await ctx.db.get(membership.tenantId);
    if (!tenant) throw new ConvexError("Your company is still being created.");
    if (args.imageStorageId) await requireCompanyImage(ctx, args.imageStorageId);

    const previousId = tenant.imageStorageId;
    await ctx.db.replace(tenant._id, {
      name: tenant.name,
      ...(tenant.address ? { address: tenant.address } : {}),
      ...(tenant.phone ? { phone: tenant.phone } : {}),
      ...(tenant.contactEmail ? { contactEmail: tenant.contactEmail } : {}),
      ...(args.imageStorageId ? { imageStorageId: args.imageStorageId } : {}),
    });
    if (previousId && previousId !== args.imageStorageId) await ctx.storage.delete(previousId);
    return null;
  },
});
