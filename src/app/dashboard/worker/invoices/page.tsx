import { WorkerInvoicesPage } from "@/components/invoices/WorkerInvoicesPanel";

export const metadata = { title: "Invoices" };

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the invoice page for the signed-in worker.
export default function Page() {
  return <WorkerInvoicesPage />;
}
