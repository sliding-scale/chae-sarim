import { redirect } from "next/navigation";

// Redirects the short admin path to the admin dashboard.
export default function AdminAliasPage() {
  redirect("/dashboard/admin");
}
