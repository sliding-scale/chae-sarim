"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

// Renders a link that opens the dashboard when the visitor is already signed in.
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
