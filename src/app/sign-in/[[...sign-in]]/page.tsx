import { SignInForm } from "@/components/auth/SignInForm";
import { SsoCallback } from "@/components/auth/SsoCallback";
import { resumeSession } from "@/lib/resume-session";
import { Suspense } from "react";

export const metadata = { title: "Sign in" };

// This page checks for an open session, so navigation into it is allowed to block.
export const instant = false;

// Shows the sign-in form, or the Google callback when Clerk returns here.
export default function SignInPage({
  params,
}: {
  params: Promise<{ "sign-in"?: string[] }>;
}) {
  return (
    <Suspense fallback={<main className="auth-page" aria-busy="true" />}>
      <SignInRoute params={params} />
    </Suspense>
  );
}

// Picks the sign-in form or the Google callback from the route.
async function SignInRoute({
  params,
}: {
  params: Promise<{ "sign-in"?: string[] }>;
}) {
  const { "sign-in": segments } = await params;
  if (segments?.includes("sso-callback")) return <SsoCallback />;
  await resumeSession();
  return <SignInForm />;
}
