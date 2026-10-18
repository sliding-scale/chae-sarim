import { AdminTimesheetsPage } from "@/components/timesheets/TimesheetsPanel";

export const metadata = { title: "Timesheets" };

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the timesheet review page for the signed-in admin's company.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { status } = await searchParams;
  const value = Array.isArray(status) ? status[0] : status;
  return <AdminTimesheetsPage status={value === "approved" ? "approved" : undefined} />;
}
