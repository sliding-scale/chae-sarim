# Convex

Functions and the schema for Chae live here. Read `convex/_generated/ai/guidelines.md` before changing them.

`schema.ts` is the current data model:

- `users` — Clerk id, name, and email. No role.
- `tenants` — one row per company (`name`).
- `memberships` — `clerkId`, `tenantId`, and `admin` or `worker`. Index: `by_clerk_id`.
- `invites` — pending Worker invites. Index: `by_email`.
- `jobSites`, `timesheets`, `workerInvoices`, `holidayRequests` — tenant-scoped records.

Do not add Clerk Organizations, a Scanner role, QR check-in, or attendance tables. Resolve `tenantId` on the server from the caller's membership.

`http.ts` receives Clerk `user.created`, `user.updated`, and `user.deleted` and syncs identity only. The next change is to create an Admin tenant on sign-up when no invite matches, and to accept a Worker invite when one does.

Run `npx convex dev` from the project root while editing these files.
