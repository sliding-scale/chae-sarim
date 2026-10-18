import { AdminInvoicesPage } from "@/components/invoices/InvoicesPanel";

export const metadata = { title: "Invoices" };

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the invoice review page for the signed-in admin's company.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { status } = await searchParams;
  const value = Array.isArray(status) ? status[0] : status;
  return <AdminInvoicesPage status={value === "approved" ? "approved" : undefined} />;
}
