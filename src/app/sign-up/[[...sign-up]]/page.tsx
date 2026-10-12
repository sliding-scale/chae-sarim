import { SignUpForm } from "@/components/auth/SignUpForm";
import { SsoCallback } from "@/components/auth/SsoCallback";

// Shows the sign-up form, or the Google callback when Clerk returns here.
export default async function SignUpPage({
  params,
}: {
  params: Promise<{ "sign-up"?: string[] }>;
}) {
  const { "sign-up": segments } = await params;
  if (segments?.includes("sso-callback")) return <SsoCallback />;
  return <SignUpForm />;
}
