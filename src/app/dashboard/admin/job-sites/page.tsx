import { JobSitesPage } from "@/components/job-sites/JobSitesPanel";

export const metadata = { title: "Job sites" };

// This page waits on the signed-in session, so navigation into it is allowed to block.
export const instant = false;

// Shows the job site page for the signed-in admin's company.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");
  return <JobSitesPage query={query} />;
}
