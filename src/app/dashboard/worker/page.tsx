import { WorkerDashboardPage } from "@/components/dashboard/WorkerOverview";

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the signed-in worker's own timesheets, invoices, and holiday requests.
export default function Page() {
  return <WorkerDashboardPage />;
}
