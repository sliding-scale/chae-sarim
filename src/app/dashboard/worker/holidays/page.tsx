import { WorkerHolidaysPage } from "@/components/holidays/WorkerHolidaysPanel";

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the holiday request page for the signed-in worker.
export default function Page() {
  return <WorkerHolidaysPage />;
}