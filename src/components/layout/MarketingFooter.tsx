import { Logo } from "@/components/brand/Logo";
import Link from "next/link";

const links = [
  { href: "/#product", label: "Product" },
  { href: "/#security", label: "Security" },
  { href: "/documentation", label: "Documentation" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

// Renders the public site footer.
export function MarketingFooter() {
  return (
    <footer className="site-footer">
      <div className="container-saas">
        <div className="footer-row">
          <Logo />
          <nav className="footer-links" aria-label="Footer">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="footer-copy">© 2026 Chae. All rights reserved.</p>
      </div>
    </footer>
  );
}
