import { WorkersPage } from "@/components/workers/WorkersPanel";

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the workers page for the signed-in admin's company.
export default function Page() {
  return <WorkersPage />;
}
