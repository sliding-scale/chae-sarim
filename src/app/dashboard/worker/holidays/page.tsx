import { WorkerHolidaysPage } from "@/components/holidays/WorkerHolidaysPanel";

export const metadata = { title: "Holidays" };

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the holiday request page for the signed-in worker.
export default function Page() {
  return <WorkerHolidaysPage />;
}