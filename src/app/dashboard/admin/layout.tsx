import { RoleGate } from "@/components/layout/RoleGate";

// This area waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Allows this section only for a membership role of admin.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow="admin">{children}</RoleGate>;
}
