import { MarketingDocument } from "@/components/layout/MarketingDocument";

export const metadata = { title: "Privacy" };

// Shows the public privacy page.
export default function PrivacyPage() {
  return (
    <MarketingDocument title="Privacy">
      <p>
        Chae stores the name and email needed to sign you into a company dashboard. Role and
        company membership are kept with that dashboard, separate from the sign-in provider.
      </p>
      <p>Worker views are limited to that person&apos;s own tasks and profile.</p>
      <p>
        Timesheets store the hours entered for each day of a week. Invoices store the month, an
        optional amount, and the files you upload. Holiday requests store the dates and the reason.
        Job sites store a name and address. Company and profile photos are stored with the account
        that uploaded them.
      </p>
      <p>
        Sign-in is handled by Clerk. Chae keeps the company, the role, and the records above in its
        own database. We do not use Clerk organisations or Clerk roles for access.
      </p>
    </MarketingDocument>
  );
}
