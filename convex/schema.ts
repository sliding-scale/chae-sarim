import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  tenants: defineTable({
    name: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  }),

  memberships: defineTable({
    tenantId: v.id("tenants"),
    clerkId: v.string(),
    role: v.union(v.literal("admin"), v.literal("worker")),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_tenant_id_and_role", ["tenantId", "role"]),

  invites: defineTable({
    tenantId: v.id("tenants"),
    email: v.string(),
    role: v.literal("worker"),
    clerkId: v.optional(v.string()),
    clerkInvitationId: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_tenant_id", ["tenantId"]),

  jobSiteAssignments: defineTable({
    tenantId: v.id("tenants"),
    clerkId: v.string(),
    jobSiteId: v.id("jobSites"),
  })
    .index("by_tenant_id_and_clerk_id", ["tenantId", "clerkId"])
    .index("by_job_site_id", ["jobSiteId"])
    .index("by_clerk_id_and_job_site_id", ["clerkId", "jobSiteId"]),

  jobSites: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    address: v.optional(v.string()),
  }).index("by_tenant_id_and_name", ["tenantId", "name"]),

  timesheets: defineTable({
    tenantId: v.id("tenants"),
    clerkId: v.string(),
    weekStart: v.string(),
    weekEnd: v.string(),
    jobSiteId: v.id("jobSites"),
    comments: v.optional(v.string()),
    hours: v.object({
      monday: v.number(),
      tuesday: v.number(),
      wednesday: v.number(),
      thursday: v.number(),
      friday: v.number(),
      saturday: v.number(),
      sunday: v.number(),
    }),
    status: v.union(v.literal("draft"), v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_job_site_id", ["jobSiteId"])
    .index("by_tenant_id_and_status", ["tenantId", "status"])
    .index("by_clerk_id_and_week_start", ["clerkId", "weekStart"]),

  workerInvoices: defineTable({
    tenantId: v.id("tenants"),
    clerkId: v.string(),
    fileStorageId: v.id("_storage"),
    fileName: v.optional(v.string()),
    invoiceFiles: v.optional(
        v.array(
            v.object({
                fileStorageId: v.id("_storage"),
                fileName: v.optional(v.string()),
            }),
        ),
    ),
    invoiceMonth: v.string(),
    jobSiteId: v.id("jobSites"),
    amount: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_job_site_id", ["jobSiteId"])
    .index("by_tenant_id_and_status", ["tenantId", "status"])
    .index("by_clerk_id", ["clerkId"]),

  holidayRequests: defineTable({
    tenantId: v.id("tenants"),
    clerkId: v.string(),
    jobSiteId: v.id("jobSites"),
    startDate: v.string(),
    endDate: v.string(),
    reason: v.string(),
    status: v.union(v.literal("draft"), v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_job_site_id", ["jobSiteId"])
    .index("by_tenant_id_and_status", ["tenantId", "status"])
    .index("by_clerk_id", ["clerkId"]),

  notifications: defineTable({
    tenantId: v.id("tenants"),
    recipientClerkId: v.string(),
    kind: v.union(v.literal("timesheet"), v.literal("invoice"), v.literal("holiday"), v.literal("member")),
    title: v.string(),
    body: v.string(),
    href: v.string(),
    sourceId: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_recipient_clerk_id", ["recipientClerkId"]),
});
