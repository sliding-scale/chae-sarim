"use client";

import { Logo } from "@/components/brand/Logo";
import { api } from "../../../convex/_generated/api";
import { homeFor } from "@/lib/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Sends a signed-in person to the admin or worker dashboard for their membership role.
export function DashboardRedirect() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const current = useQuery(api.users.queries.getCurrentUser);
  const wasAuthenticated = useRef(false);
  if (isAuthenticated) wasAuthenticated.current = true;

  useEffect(() => {
    if (!isLoading && isAuthenticated) sessionStorage.removeItem("chae-signing-out");
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/sign-in");
      return;
    }
    if (current?.role) router.replace(homeFor(current.role));
  }, [current, isAuthenticated, isLoading, router]);

  const waiting = !current?.role;
  const signingOut =
    wasAuthenticated.current &&
    (isLoading || !isAuthenticated) &&
    typeof window !== "undefined" &&
    sessionStorage.getItem("chae-signing-out") === "1";
  let title = "Opening your dashboard";
  let body = "Checking your role and opening the right dashboard.";
  if (signingOut) {
    title = "Signing out";
    body = "Closing your session.";
  } else if (waiting && isAuthenticated && current) {
    title = "Creating your dashboard";
    body = "Your account is signed in. Your company membership is still being created.";
  }
  return (
    <div className="setup-screen">
      <section className="saas-card setup-card">
        <Logo />
        <h1 className="page-title" style={{ marginTop: 20, fontSize: "1.6rem" }}>
          {title}
        </h1>
        <p>{body}</p>
      </section>
    </div>
  );
}
