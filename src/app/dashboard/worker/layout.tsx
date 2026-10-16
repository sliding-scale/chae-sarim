import { RoleGate } from "@/components/layout/RoleGate";
import "../dashboard.css";

// This area waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Allows this section only for a membership role of worker.
export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow="worker">{children}</RoleGate>;
}
