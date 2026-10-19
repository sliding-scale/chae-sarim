"use client";

import { AuthLink } from "@/components/auth/AuthLink";
import { Logo } from "@/components/brand/Logo";
import { UserAvatar } from "@/components/users/UserAvatar";
import { api } from "../../../convex/_generated/api";
import { SignOutButton, useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const links = [
  { href: "/#product", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#roles", label: "Roles" },
];

// Renders the public site navigation.
export function MarketingNavbar() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const current = useQuery(api.users.queries.getCurrentUser);
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

  useEffect(() => {
    // Closes the account menu when the pointer lands outside it.
    function onPointer(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    }
    // Closes the account menu when Escape is pressed.
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

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
            <div className="menu" ref={accountRef}>
              <button
                type="button"
                className="icon-button"
                aria-label="Account menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((value) => !value)}
              >
                <UserAvatar name={name} imageUrl={current?.imageUrl || (user?.hasImage ? user.imageUrl : null)} />
              </button>
              {accountOpen ? (
                <div className="menu-panel" role="menu">
                  <Link href="/dashboard" onClick={() => setAccountOpen(false)}>
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>
                  <SignOutButton redirectUrl="/">
                    <button
                      type="button"
                      onClick={() => sessionStorage.setItem("chae-signing-out", "1")}
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </SignOutButton>
                </div>
              ) : null}
            </div>
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
