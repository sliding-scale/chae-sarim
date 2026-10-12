"use client";

import { AuthLink } from "@/components/auth/AuthLink";
import { Logo } from "@/components/brand/Logo";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/#product", label: "Product" },
  { href: "/#features", label: "Features" },
  { href: "/#security", label: "Security" },
  { href: "/#pricing", label: "Pricing" },
];

// Renders the public site navigation.
export function MarketingNavbar() {
  const { isLoaded, isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="landing-header">
      <div className="container-saas landing-nav">
        <Logo />
        <nav className={open ? "nav-links is-open" : "nav-links"} aria-label="Primary">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          {isLoaded && isSignedIn ? (
            <Link className="btn-primary" href="/dashboard">
              Open dashboard
            </Link>
          ) : (
            <>
              <AuthLink className="btn-text" href="/sign-in">
                Sign in
              </AuthLink>
              <AuthLink className="btn-primary" href="/sign-up">
                Get started
              </AuthLink>
            </>
          )}
          {isLoaded && isSignedIn ? (
            <SignOutButton redirectUrl="/">
              <button type="button" className="btn-text">
                Sign out
              </button>
            </SignOutButton>
          ) : null}
          <button
            type="button"
            className="nav-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
