// Shows a sign-in or sign-up error when one is present.
export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="auth-alert" role="alert">
      {message}
    </p>
  );
}
