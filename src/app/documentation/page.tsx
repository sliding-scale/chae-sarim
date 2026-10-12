import { MarketingDocument } from "@/components/layout/MarketingDocument";

// Shows the public documentation page.
export default function DocumentationPage() {
  return (
    <MarketingDocument title="Documentation">
      <p>
        Administrators land on their company: workers, job sites, and items waiting for review.
        Workers land on their own timesheets, invoices, and holiday requests.
      </p>
      <p>
        The signed-in role comes from the company membership. Hiding a link is not the security
        boundary. The server still checks who is calling before it reads company data.
      </p>
    </MarketingDocument>
  );
}
