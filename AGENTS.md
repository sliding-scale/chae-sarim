<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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
- Resolve `tenantId` on the server from the caller's membership. Never accept it from the client, and never read it from a Clerk claim.

## Helpers

Put every Convex helper in `convex/lib.ts`. Query and mutation files register functions and call those helpers. Do not keep helper functions in the same file as a query or mutation.

## Schema

The tables in `convex/schema.ts` are in place: `users`, `tenants`, `memberships`, `invites`, `jobSites`, `jobSiteAssignments`, `timesheets`, `workerInvoices`, `holidayRequests`, and `notifications`. There is no Scanner role, QR check-in, or attendance table.

Dates are `YYYY-MM-DD` strings. `invoiceMonth` is `YYYY-MM`. `updatedAt` is a number from `Date.now()`. Timesheet status includes `draft`.

## Next

When someone signs up and no invite matches their email, create a tenant and a membership with role `admin`. When an invite matches, create the Worker membership and delete the invite.
