"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Logo } from "@/components/brand/Logo";
import { api } from "../../../convex/_generated/api";
import { homeFor, type AppRole } from "@/lib/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef } from "react";

export type Workspace = {
  name: string;
  email: string;
  role: AppRole;
  tenantName: string | null;
};

const WorkspaceContext = createContext<Workspace | null>(null);

// Returns the signed-in company details for the current dashboard page.
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Dashboard details are only available inside a signed-in dashboard.");
  return value;
}

// Shows the dashboard only when the Convex membership role matches this page.
export function RoleGate({
  allow,
  children,
}: {
  allow: AppRole;
  children: React.ReactNode;
}) {
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
    if (!current?.role || current.role === allow) return;
    router.replace(homeFor(current.role));
  }, [allow, current, isAuthenticated, isLoading, router]);

  const session = !isLoading && isAuthenticated && current?.role === allow ? current : null;
  const workspace: Workspace = session
    ? {
        name: session.name,
        email: session.email,
        role: allow,
        tenantName: session.tenantName,
      }
    : {
        name: "",
        email: "",
        role: allow,
        tenantName: null,
      };

  const signingOut =
    wasAuthenticated.current &&
    (isLoading || !isAuthenticated) &&
    typeof window !== "undefined" &&
    sessionStorage.getItem("chae-signing-out") === "1";
  let statusTitle = signingOut ? "Signing out" : "Opening your dashboard";
  let statusBody = signingOut ? "Closing your session." : "Checking your session.";
  if (!isLoading && isAuthenticated && current && !current.role) {
    statusTitle = "Creating your dashboard";
    statusBody = "Your account is signed in. Your company membership is still being created.";
  } else if (!isLoading && isAuthenticated && current?.role && current.role !== allow) {
    statusBody = "Sending you to the right dashboard.";
  }

  return (
    <WorkspaceContext.Provider value={workspace}>
      {session ? (
        <DashboardShell role={workspace.role} name={workspace.name} tenantName={workspace.tenantName}>
          {children}
        </DashboardShell>
      ) : (
        <StatusCard title={statusTitle} body={statusBody} />
      )}
    </WorkspaceContext.Provider>
  );
}

// Shows a short status message while the membership check is still running.
function StatusCard({ title, body }: { title: string; body: string }) {
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
