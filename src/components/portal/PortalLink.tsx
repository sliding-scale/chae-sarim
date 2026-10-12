import Link from "next/link";

// Renders a dashboard card that links to one section.
export function PortalLink({
  href,
  label,
  body,
}: {
  href: string;
  label: string;
  body: string;
}) {
  return (
    <Link href={href} className="saas-card portal-link">
      <h2 className="panel-title">{label}</h2>
      <p className="panel-copy">{body}</p>
    </Link>
  );
}
