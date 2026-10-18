// Opens the job sites list already searched for this site.
export function jobSiteSearchHref(name: string) {
  return `/dashboard/admin/job-sites?q=${encodeURIComponent(name)}`;
}
