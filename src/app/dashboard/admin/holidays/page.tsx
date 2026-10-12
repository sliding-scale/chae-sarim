import { AdminHolidaysPage } from "@/components/holidays/HolidaysPanel";

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the holiday review page for the signed-in admin's company.
export default function Page() {
  return <AdminHolidaysPage />;
}
