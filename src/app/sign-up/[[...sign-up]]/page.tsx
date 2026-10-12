import { SignUpForm } from "@/components/auth/SignUpForm";
import { SsoCallback } from "@/components/auth/SsoCallback";
import { Suspense } from "react";

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
  return <SignUpForm />;
}
