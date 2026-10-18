import { WorkerTimesheetsPage } from "@/components/timesheets/WorkerTimesheetsPanel";

export const metadata = { title: "Timesheets" };

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the timesheet page for the signed-in worker.
export default function Page() {
  return <WorkerTimesheetsPage />;
}
