import { WorkerTimesheetsPage } from "@/components/timesheets/WorkerTimesheetsPanel";

export const metadata = { title: "Timesheets" };

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the timesheet page for the signed-in worker.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");
  return <WorkerTimesheetsPage query={query} />;
}
