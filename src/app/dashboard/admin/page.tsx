import { AdminDashboardPage } from "@/components/dashboard/AdminOverview";

export const metadata = { title: "Overview" };

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows workers, job sites, and pending approvals for the signed-in admin's company.
export default function Page() {
  return <AdminDashboardPage />;
}
