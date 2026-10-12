import { AdminInvoicesPage } from "@/components/invoices/InvoicesPanel";

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the invoice review page for the signed-in admin's company.
export default function Page() {
  return <AdminInvoicesPage />;
}
