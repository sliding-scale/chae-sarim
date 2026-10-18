import { SignUpForm } from "@/components/auth/SignUpForm";
import { SsoCallback } from "@/components/auth/SsoCallback";
import { resumeSession } from "@/lib/resume-session";
import { Suspense } from "react";

export const metadata = { title: "Sign up" };

// This page checks for an open session, so navigation into it is allowed to block.
export const instant = false;

// Shows the sign-up form, or the Google callback when Clerk returns here.
export default function SignUpPage({
  params,
}: {
  params: Promise<{ "sign-up"?: string[] }>;
}) {
  return (
    <Suspense fallback={<main className="auth-page" aria-busy="true" />}>
      <SignUpRoute params={params} />
    </Suspense>
  );
}

// Picks the sign-up form or the Google callback from the route.
async function SignUpRoute({
  params,
}: {
  params: Promise<{ "sign-up"?: string[] }>;
}) {
  const { "sign-up": segments } = await params;
  if (segments?.includes("sso-callback")) return <SsoCallback />;
  await resumeSession();
  return <SignUpForm />;
}
