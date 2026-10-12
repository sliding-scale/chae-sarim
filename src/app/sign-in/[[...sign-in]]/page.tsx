import { SignInForm } from "@/components/auth/SignInForm";
import { SsoCallback } from "@/components/auth/SsoCallback";

// Shows the sign-in form, or the Google callback when Clerk returns here.
export default async function SignInPage({
  params,
}: {
  params: Promise<{ "sign-in"?: string[] }>;
}) {
  const { "sign-in": segments } = await params;
  if (segments?.includes("sso-callback")) return <SsoCallback />;
  return <SignInForm />;
}
