import { FileText } from "lucide-react";

// Shows the amber notice from the worker designs when no job site is assigned.
export function NoSitesNotice({ message }: { message: string }) {
  return (
    <div className="worker-warning" role="status">
      <span>
        <FileText aria-hidden="true" />
      </span>
      <div>
        <strong>No job sites assigned</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
