"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

// Renders a text link used on the sign-in and sign-up screens.
export function AuthLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const destination = isLoaded && isSignedIn ? "/dashboard" : href;

  return (
    <Link className={className} href={destination}>
      {children}
    </Link>
  );
}
