"use client";

import { Logo } from "@/components/brand/Logo";
import { api } from "../../../convex/_generated/api";
import { homeFor } from "@/lib/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Sends a signed-in person to the admin or worker dashboard for their membership role.
export function DashboardRedirect() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const current = useQuery(api.users.queries.getCurrentUser);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/sign-in");
      return;
    }
    if (current?.role) router.replace(homeFor(current.role));
  }, [current, isAuthenticated, isLoading, router]);

  const waiting = !current?.role;
  return (
    <div className="setup-screen">
      <section className="saas-card setup-card">
        <Logo />
        <h1 className="page-title" style={{ marginTop: 20, fontSize: "1.6rem" }}>
          {waiting && isAuthenticated && current ? "Creating your dashboard" : "Opening your dashboard"}
        </h1>
        <p>
          {waiting && isAuthenticated && current
            ? "Your account is signed in. Your company membership is still being created."
            : "Checking your role and opening the right dashboard."}
        </p>
      </section>
    </div>
  );
}
