"use client";

import { HandleSSOCallback } from "@clerk/react";
import { useRouter } from "next/navigation";

// Finishes a Google sign-in or sign-up after Clerk redirects back.
export function SsoCallback() {
  const router = useRouter();

  return (
    <main className="auth-page">
      <section className="auth-card" style={{ textAlign: "center" }}>
        <HandleSSOCallback
          navigateToApp={({ decorateUrl }) => {
            window.location.assign(decorateUrl("/dashboard"));
          }}
          navigateToSignIn={() => router.push("/sign-in")}
          navigateToSignUp={() => router.push("/sign-up")}
        />
        <p className="auth-copy">Finishing sign-in…</p>
      </section>
    </main>
  );
}
