import { MarketingDocument } from "@/components/layout/MarketingDocument";

export const metadata = { title: "Documentation" };

// Shows the public documentation page.
export default function DocumentationPage() {
  return (
    <MarketingDocument title="Documentation">
      <p>
        Administrators land on their company: workers, job sites, and items waiting for review.
        Workers land on their own timesheets, invoices, and holidays.
      </p>
      <p>
        The signed-in role comes from the company membership. Hiding a link is not the security
        boundary. The server still checks who is calling before it reads company data.
      </p>
      <p>
        An administrator adds job sites, invites workers, and assigns each worker to the sites they
        can use. A worker then submits a weekly timesheet, uploads an invoice for a month, or
        requests a holiday. Each of those stays pending until an administrator approves or rejects it.
      </p>
      <p>
        Dates are stored as a calendar day. Invoice months are stored as a year and month. Amounts
        are shown in PKR. A new account with no invite becomes the administrator of a new company.
        An invite for that email joins the worker to the company that sent it.
      </p>
    </MarketingDocument>
  );
}
