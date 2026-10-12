import { JobSitesPage } from "@/components/job-sites/JobSitesPanel";

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the job site page for the signed-in admin's company.
export default function Page() {
  return <JobSitesPage />;
}
