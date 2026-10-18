import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Sends a person who still has a Clerk session straight to the dashboard.
export async function resumeSession() {
  const { isAuthenticated } = await auth();
  if (isAuthenticated) redirect("/dashboard");
}
