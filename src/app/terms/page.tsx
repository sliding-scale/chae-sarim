import { MarketingDocument } from "@/components/layout/MarketingDocument";

export const metadata = { title: "Terms" };

// Shows the public terms page.
export default function TermsPage() {
  return (
    <MarketingDocument title="Terms">
      <p>
        Chae is a dashboard for administrators and workers. Creating an account makes you the
        administrator of a new company unless you were invited as a worker.
      </p>
      <p>Use the product only for a company you are allowed to manage or work in.</p>
      <p>
        Administrators are responsible for the workers they invite and the job sites they add.
        Workers are responsible for the hours, invoices, and holiday requests they submit. Rejected
        records stay visible with the reason an administrator gave.
      </p>
      <p>
        There is no separate paid tier. One company account covers the administrator and the workers
        they invite. Do not upload files you are not allowed to share with that company.
      </p>
    </MarketingDocument>
  );
}
