import { MarketingDocument } from "@/components/layout/MarketingDocument";

// Shows the public terms page.
export default function TermsPage() {
  return (
    <MarketingDocument title="Terms">
      <p>
        Chae is a dashboard for administrators and workers. Creating an account makes you the
        administrator of a new company unless you were invited as a worker.
      </p>
      <p>Use the product only for a company you are allowed to manage or work in.</p>
    </MarketingDocument>
  );
}
