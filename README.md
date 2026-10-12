# Chae

Multi-tenant workforce app for companies that send workers to job sites. Admins manage sites and approve timesheets, invoices, and holiday requests. Workers submit their own.

Clerk handles sign-in. Convex stores the company, the Admin or Worker role, and every tenant-scoped record. Progress is tracked in `../OBJECTIVES.md`.

## Run locally

From this folder, in two terminals:

```bash
npx convex dev
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data model

`convex/schema.ts` defines `users`, `tenants`, `memberships`, `invites`, `jobSites`, `timesheets`, `workerInvoices`, and `holidayRequests`. Feature rows carry a `tenantId`. Identity rows do not carry a role.

The next behavior to build is tenant creation: a sign-up with no matching invite creates a company and makes that person its Admin.
