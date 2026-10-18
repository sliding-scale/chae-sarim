import { Logo } from "@/components/brand/Logo";

// Wraps a sign-in or sign-up form in the shared card layout.
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">
          <Logo />
        </div>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-copy">{description}</p>
        {children}
      </section>
    </main>
  );
}
