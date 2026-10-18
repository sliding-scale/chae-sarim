import { DashboardRedirect } from "@/components/dashboard/DashboardRedirect";

export const metadata = { title: "Dashboard" };

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Sends a signed-in person to the admin or worker dashboard for their membership role.
export default function DashboardPage() {
  return <DashboardRedirect />;
}
