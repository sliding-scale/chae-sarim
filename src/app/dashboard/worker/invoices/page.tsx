import { WorkerInvoicesPage } from "@/components/invoices/WorkerInvoicesPanel";

export const metadata = { title: "Invoices" };

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the invoice page for the signed-in worker.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");
  return <WorkerInvoicesPage query={query} />;
}
