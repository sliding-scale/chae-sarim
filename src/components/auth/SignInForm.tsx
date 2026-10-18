"use client";

import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleLogo } from "@/components/auth/GoogleLogo";
import { AuthError } from "@/components/auth/AuthError";
import { AuthInput } from "@/components/auth/AuthInput";
import { useAuth, useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

type Step = "credentials" | "reset" | "code" | "mfa";

const GOOGLE_ONLY =
  "This account uses Google. Continue with Google to sign in.";

// Turns a Clerk sign-in error code into a short message.
function friendly(code: string | undefined, fallback: string) {
  if (code === "strategy_for_user_invalid" || code === "form_password_not_set") {
    return GOOGLE_ONLY;
  }
  if (code === "form_password_incorrect" || code === "form_identifier_not_found") {
    return "Invalid email or password.";
  }
  return fallback;
}

// Signs an existing person in with a password, Google, or a reset code.
export function SignInForm() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn, errors, fetchStatus } = useSignIn();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; code?: string }>({});
  const [googleBusy, setGoogleBusy] = useState(false);
  const busy = fetchStatus === "fetching";
  const signingIn = busy && !googleBusy;

  // Opens the dashboard when this browser already has a Clerk session.
  useEffect(() => {
    if (isLoaded && isSignedIn) window.location.assign("/dashboard");
  }, [isLoaded, isSignedIn]);

  // Sends the browser to the dashboard after Clerk finishes sign-in.
  function goDashboard() {
    return ({ decorateUrl }: { decorateUrl: (url: string) => string }) => {
      window.location.assign(decorateUrl("/dashboard"));
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
    if (!email.includes("@")) next.email = "Enter a valid email.";
    if (!password) next.password = "Enter your password.";
    setFieldErrors(next);
    setLocalError(null);
    if (Object.keys(next).length) return;

    const created = await signIn.create({ identifier: email });
    if (created.error) {
      if (created.error.code === "session_exists" || created.error.code === "identifier_already_signed_in") {
        window.location.assign("/dashboard");
        return;
      }
      setLocalError(friendly(created.error.code, created.error.longMessage || created.error.message));
      return;
    }
    const strategies = (signIn.supportedFirstFactors ?? []).map((factor) => factor.strategy);
    if (strategies.includes("oauth_google") && !strategies.includes("password")) {
      setLocalError(GOOGLE_ONLY);
      return;
    }
    const result = await signIn.password({ password });
    if (result.error) {
      setLocalError(friendly(result.error.code, result.error.longMessage || result.error.message));
      return;
    }
    await finish();
  }

  // Starts Google sign-in.
  async function onGoogle() {
    setLocalError(null);
    setGoogleBusy(true);
    const result = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: "/dashboard",
      redirectCallbackUrl: "/sign-in/sso-callback",
    });
    if (result.error) {
      setGoogleBusy(false);
      setLocalError(result.error.longMessage || result.error.message);
    }
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
    setNotice(null);
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
    if (!nextPassword) next.password = "Enter a password.";
    setFieldErrors(next);
    setLocalError(null);
    setNotice(null);
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

  // Sends another password reset code to the same email.
  async function onResendReset() {
    setLocalError(null);
    setNotice(null);
    const sent = await signIn.resetPasswordEmailCode.sendCode();
    if (sent.error) {
      setLocalError(sent.error.longMessage || sent.error.message);
      return;
    }
    setNotice("A new code was sent to your email.");
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
    setNotice(null);
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

  // Sends another second-factor code by email or phone.
  async function onResendMfa() {
    setLocalError(null);
    setNotice(null);
    const strategy = signIn.supportedSecondFactors[0]?.strategy;
    const sent = strategy === "phone_code" ? await signIn.mfa.sendPhoneCode() : await signIn.mfa.sendEmailCode();
    if (sent.error) {
      setLocalError(sent.error.longMessage || sent.error.message);
      return;
    }
    setNotice(strategy === "phone_code" ? "A new code was sent to your phone." : "A new code was sent to your email.");
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
            error={fieldErrors.email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <AuthInput
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            error={fieldErrors.password}
            onChange={(event) => setPassword(event.target.value)}
            action={
              <button type="button" className="link-button" onClick={() => setStep("reset")}>
                Forgot password?
              </button>
            }
          />
          <button className="btn-primary btn-block" type="submit" disabled={busy || googleBusy}>
            {signingIn ? <span className="spinner" aria-hidden="true" /> : null}
            {signingIn ? "Signing in…" : "Sign in"}
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
            {busy ? "Sending code…" : "Send reset code"}
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
            action={
              <button type="button" className="link-button" onClick={onResendReset} disabled={busy}>
                Send again
              </button>
            }
          />
          {notice ? <p className="auth-note">{notice}</p> : null}
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
            {busy ? "Updating password…" : "Update password"}
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
            error={fieldErrors.code}
            onChange={(event) => setCode(event.target.value)}
            action={
              signIn.supportedSecondFactors[0]?.strategy === "totp" ||
              signIn.supportedSecondFactors[0]?.strategy === "backup_code" ? undefined : (
                <button type="button" className="link-button" onClick={onResendMfa} disabled={busy}>
                  Send again
                </button>
              )
            }
          />
          {notice ? <p className="auth-note">{notice}</p> : null}
          <button className="btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Continue"}
          </button>
        </form>
      ) : null}
      {step === "credentials" ? (
        <>
          <div className="auth-divider">OR</div>
          <button className="btn-secondary btn-block" type="button" onClick={onGoogle} disabled={busy || googleBusy}>
            {googleBusy ? <span className="spinner" aria-hidden="true" /> : <GoogleLogo />}
            {googleBusy ? "Continuing…" : "Continue with Google"}
          </button>
          <p className="auth-switch">
            Don&apos;t have an account? <Link href="/sign-up">Create one</Link>
          </p>
        </>
      ) : null}
    </AuthCard>
  );
}
