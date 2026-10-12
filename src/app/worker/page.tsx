import { redirect } from "next/navigation";

// Redirects the short worker path to the worker dashboard.
export default function WorkerAliasPage() {
  redirect("/dashboard/worker");
}
