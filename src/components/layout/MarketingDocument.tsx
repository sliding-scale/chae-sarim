import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";

// Renders a public document page such as privacy or terms.
export function MarketingDocument({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-shell">
      <MarketingNavbar />
      <main className="container-saas legal-page">
        <h1>{title}</h1>
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
