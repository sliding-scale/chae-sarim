<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Chae

Multi-tenant workforce app. The checklist lives in `../OBJECTIVES.md`. The original single-tenant app is `../chae_original` and is a reference only.

## Auth

Clerk proves identity. Convex owns the company and the role. Do not use Clerk Organizations, invitations, memberships, or roles.

- `users` stores `clerkId`, `name`, and `email` only. The webhook in `convex/http.ts` syncs `user.created`, `user.updated`, and `user.deleted`.
- `memberships` maps `clerkId` plus `tenantId` to `admin` or `worker`. Look it up with the `by_clerk_id` index.
- `invites` are Worker invites only, looked up with the `by_email` index.

## Access

- Every Convex query and mutation checks `ctx.auth.getUserIdentity()` before it touches data.
- Resolve `tenantId` on the server from the caller's membership. The client does not send it.
- A query never returns another tenant's rows.
- Read the role from the Convex membership for the current tenant. Never from a Clerk claim, and never from the client.

## Helpers

Put every Convex helper in `convex/lib.ts`. Query and mutation files register functions and call those helpers. Do not keep helper functions in the same file as a query or mutation.

## Functions

Add a short comment above every function you create, saying what it does.

## Leave out

- Clerk Organizations, Clerk invitations, Clerk memberships, and Clerk roles.
- Scanner, QR codes, and attendance.
- Billing, extra permission tiers, and invoice PDF polish.

## Schema

The tables in `convex/schema.ts` are in place: `users`, `tenants`, `memberships`, `invites`, `jobSites`, `jobSiteAssignments`, `timesheets`, `workerInvoices`, `holidayRequests`, and `notifications`. There is no Scanner role, QR check-in, or attendance table.

Dates are `YYYY-MM-DD` strings. `invoiceMonth` is `YYYY-MM`. `updatedAt` is a number from `Date.now()`. Timesheet status includes `draft`.
