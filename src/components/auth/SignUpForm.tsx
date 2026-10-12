"use client";

import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleLogo } from "@/components/auth/GoogleLogo";
import { AuthError } from "@/components/auth/AuthError";
import { AuthInput } from "@/components/auth/AuthInput";
import { useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Creates an account with a password or Google, then confirms the email when Clerk asks.
export function SignUpForm() {
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [verify, setVerify] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const busy = fetchStatus === "fetching";

  // Sends the browser to the dashboard after Clerk finishes sign-up.
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

  // Opens the dashboard once sign-up is complete.
  async function finish() {
    if (signUp.status !== "complete") return;
    await signUp.finalize({ navigate: goDashboard() });
  }

  // Creates the account from the name, email, and password in the form.
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Enter your full name.";
    if (!email.includes("@")) next.email = "Enter a valid work email.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords do not match.";
    setFieldErrors(next);
    setLocalError(null);
    if (Object.keys(next).length) return;

    const [firstName, ...rest] = name.trim().split(/\s+/);
    const result = await signUp.password({
      emailAddress: email,
      password,
      firstName,
      lastName: rest.join(" ") || undefined,
      legalAccepted: true,
    });
    if (result.error) {
      setLocalError(result.error.longMessage || result.error.message);
      return;
    }
    if (signUp.status === "complete") {
      await finish();
      return;
    }
    if (signUp.unverifiedFields?.includes("email_address")) {
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) {
        setLocalError(sent.error.longMessage || sent.error.message);
        return;
      }
      setVerify(true);
    }
  }

  // Confirms the email with the code Clerk sent.
  async function onVerify(event: React.FormEvent) {
    event.preventDefault();
    if (code.trim().length < 4) {
      setFieldErrors({ code: "Enter the code from your email." });
      return;
    }
    setFieldErrors({});
    setLocalError(null);
    const result = await signUp.verifications.verifyEmailCode({ code });
    if (result.error) {
      setFieldErrors({ code: result.error.longMessage || result.error.message });
      return;
    }
    await finish();
  }

  // Starts Google sign-up.
  async function onGoogle() {
    setLocalError(null);
    const result = await signUp.sso({
      strategy: "oauth_google",
      redirectUrl: "/dashboard",
      redirectCallbackUrl: "/sign-up/sso-callback",
    });
    if (result.error) setLocalError(result.error.longMessage || result.error.message);
  }

  const alert = localError || errors.global?.[0]?.longMessage || errors.global?.[0]?.message || null;

  return (
    <AuthCard title="Create your dashboard" description="Set up your account and start managing access.">
      <AuthError message={alert} />
      <div id="clerk-captcha" />
      {verify ? (
        <form onSubmit={onVerify} noValidate>
          <AuthInput
            id="code"
            label="Email code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter the code"
            value={code}
            error={fieldErrors.code || errors.fields?.code?.longMessage}
            onChange={(event) => setCode(event.target.value)}
          />
          <button className="btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? <span className="spinner" aria-hidden="true" /> : null}
            {busy ? "Creating account..." : "Verify email"}
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <AuthInput
            id="name"
            label="Full name"
            autoComplete="name"
            placeholder="Sarah Khan"
            value={name}
            error={fieldErrors.name || errors.fields?.firstName?.longMessage}
            onChange={(event) => setName(event.target.value)}
          />
          <AuthInput
            id="email"
            label="Work email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            error={fieldErrors.email || errors.fields?.emailAddress?.longMessage}
            onChange={(event) => setEmail(event.target.value)}
          />
          <AuthInput
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            error={fieldErrors.password || errors.fields?.password?.longMessage}
            onChange={(event) => setPassword(event.target.value)}
          />
          <AuthInput
            id="confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirm}
            error={fieldErrors.confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
          <button className="btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? <span className="spinner" aria-hidden="true" /> : null}
            {busy ? "Creating account..." : "Create account"}
          </button>
          <p className="terms-note">
            By creating an account, you agree to our <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy&nbsp;Policy</Link>.
          </p>
        </form>
      )}
      {verify ? null : (
        <>
          <div className="auth-divider">OR</div>
          <button className="btn-secondary btn-block" type="button" onClick={onGoogle} disabled={busy}>
            <GoogleLogo />
            Continue with Google
          </button>
        </>
      )}
      <p className="auth-switch">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </AuthCard>
  );
}
