import { MarketingDocument } from "@/components/layout/MarketingDocument";

// Shows the public privacy page.
export default function PrivacyPage() {
  return (
    <MarketingDocument title="Privacy">
      <p>
        Chae stores the name and email needed to sign you into a company dashboard. Role and
        company membership are kept with that dashboard, separate from the sign-in provider.
      </p>
      <p>Worker views are limited to that person&apos;s own tasks and profile.</p>
    </MarketingDocument>
  );
}
