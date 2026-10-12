"use client";

import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleLogo } from "@/components/auth/GoogleLogo";
import { AuthError } from "@/components/auth/AuthError";
import { AuthInput } from "@/components/auth/AuthInput";
import { useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "credentials" | "reset" | "code" | "mfa";

// Turns a Clerk sign-in error code into a short message.
function friendly(code: string | undefined, fallback: string) {
  if (code === "form_password_incorrect" || code === "form_identifier_not_found") {
    return "Invalid email or password.";
  }
  return fallback;
}

// Signs an existing person in with a password, Google, or a reset code.
export function SignInForm() {
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; code?: string }>({});
  const busy = fetchStatus === "fetching";

  // Sends the browser to the dashboard after Clerk finishes sign-in.
  function goDashboard() {
    return ({ decorateUrl }: { decorateUrl: (url: string) => string }) => {
      const destination = decorateUrl("/dashboard");
      if (destination.startsWith("http")) {
        window.location.href = destination;
        return;
      }
      router.push(destination);
    };
  }

  // Completes sign-in, or switches to the second-factor step when Clerk asks for one.
  async function finish() {
    if (signIn.status !== "complete") {
      if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
        setStep("mfa");
      }
      return;
    }
    await signIn.finalize({ navigate: goDashboard() });
  }

  // Signs in with the email and password from the form.
  async function onSignIn(event: React.FormEvent) {
    event.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!email.includes("@")) next.email = "Enter a valid work email.";
    if (!password) next.password = "Enter your password.";
    setFieldErrors(next);
    setLocalError(null);
    if (Object.keys(next).length) return;

    const result = await signIn.password({ emailAddress: email, password });
    if (result.error) {
      setLocalError(friendly(result.error.code, result.error.longMessage || result.error.message));
      return;
    }
    await finish();
  }

  // Starts Google sign-in.
  async function onGoogle() {
    setLocalError(null);
    const result = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: "/dashboard",
      redirectCallbackUrl: "/sign-in/sso-callback",
    });
    if (result.error) setLocalError(result.error.longMessage || result.error.message);
  }

  // Emails a password reset code to the address in the form.
  async function onSendReset(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setFieldErrors({ email: "Enter the email on your account." });
      return;
    }
    setFieldErrors({});
    setLocalError(null);
    const created = await signIn.create({ identifier: email });
    if (created.error) {
      setLocalError(created.error.longMessage || created.error.message);
      return;
    }
    const sent = await signIn.resetPasswordEmailCode.sendCode();
    if (sent.error) {
      setLocalError(sent.error.longMessage || sent.error.message);
      return;
    }
    setStep("code");
  }

  // Sets a new password with the reset code from email.
  async function onReset(event: React.FormEvent) {
    event.preventDefault();
    const next: { code?: string; password?: string } = {};
    if (code.trim().length < 4) next.code = "Enter the code from your email.";
    if (nextPassword.length < 8) next.password = "Use at least 8 characters.";
    setFieldErrors(next);
    setLocalError(null);
    if (Object.keys(next).length) return;

    const verified = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (verified.error) {
      setFieldErrors({ code: verified.error.longMessage || verified.error.message });
      return;
    }
    const submitted = await signIn.resetPasswordEmailCode.submitPassword({ password: nextPassword });
    if (submitted.error) {
      setLocalError(submitted.error.longMessage || submitted.error.message);
      return;
    }
    await finish();
  }

  // Checks the second-factor code and finishes sign-in.
  async function onMfa(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setFieldErrors({ code: "Enter your verification code." });
      return;
    }
    setFieldErrors({});
    setLocalError(null);
    const strategy = signIn.supportedSecondFactors[0]?.strategy;
    const result =
      strategy === "totp"
        ? await signIn.mfa.verifyTOTP({ code })
        : strategy === "backup_code"
          ? await signIn.mfa.verifyBackupCode({ code })
          : strategy === "phone_code"
            ? await signIn.mfa.verifyPhoneCode({ code })
            : await signIn.mfa.verifyEmailCode({ code });
    if (result.error) {
      setLocalError(result.error.longMessage || result.error.message);
      return;
    }
    await finish();
  }

  const alert =
    localError ||
    errors.global?.[0]?.longMessage ||
    errors.global?.[0]?.message ||
    null;

  return (
    <AuthCard title="Welcome back" description="Sign in to access your dashboard.">
      <AuthError message={alert} />
      <div id="clerk-captcha" />
      {step === "credentials" ? (
        <form onSubmit={onSignIn} noValidate>
          <AuthInput
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            error={fieldErrors.email || errors.fields?.identifier?.longMessage}
            onChange={(event) => setEmail(event.target.value)}
          />
          <AuthInput
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            error={fieldErrors.password || errors.fields?.password?.longMessage}
            onChange={(event) => setPassword(event.target.value)}
            action={
              <button type="button" className="link-button" onClick={() => setStep("reset")}>
                Forgot password?
              </button>
            }
          />
          <button className="btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? <span className="spinner" aria-hidden="true" /> : null}
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      ) : null}
      {step === "reset" ? (
        <form onSubmit={onSendReset} noValidate>
          <AuthInput
            id="reset-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            error={fieldErrors.email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? "Sending code..." : "Send reset code"}
          </button>
          <p className="auth-switch">
            <button type="button" className="link-button" onClick={() => setStep("credentials")}>
              Back to sign in
            </button>
          </p>
        </form>
      ) : null}
      {step === "code" ? (
        <form onSubmit={onReset} noValidate>
          <AuthInput
            id="reset-code"
            label="Reset code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter the code"
            value={code}
            error={fieldErrors.code}
            onChange={(event) => setCode(event.target.value)}
          />
          <AuthInput
            id="new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a new password"
            value={nextPassword}
            error={fieldErrors.password}
            onChange={(event) => setNextPassword(event.target.value)}
          />
          <button className="btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? "Updating password..." : "Update password"}
          </button>
        </form>
      ) : null}
      {step === "mfa" ? (
        <form onSubmit={onMfa} noValidate>
          <AuthInput
            id="mfa-code"
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter your code"
            value={code}
            error={fieldErrors.code || errors.fields?.code?.longMessage}
            onChange={(event) => setCode(event.target.value)}
          />
          <button className="btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Continue"}
          </button>
        </form>
      ) : null}
      {step === "credentials" ? (
        <>
          <div className="auth-divider">OR</div>
          <button className="btn-secondary btn-block" type="button" onClick={onGoogle} disabled={busy}>
            <GoogleLogo />
            Continue with Google
          </button>
          <p className="auth-switch">
            Don&apos;t have an account? <Link href="/sign-up">Create one</Link>
          </p>
        </>
      ) : null}
    </AuthCard>
  );
}
