import { AdminTimesheetsPage } from "@/components/timesheets/TimesheetsPanel";

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the timesheet review page for the signed-in admin's company.
export default function Page() {
  return <AdminTimesheetsPage />;
}
