import { SignInForm } from "@/components/auth/SignInForm";
import { SsoCallback } from "@/components/auth/SsoCallback";
import { Suspense } from "react";

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
  return <SignInForm />;
}
