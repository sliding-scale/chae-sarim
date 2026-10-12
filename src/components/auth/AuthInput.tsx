import { RequiredMark } from "@/components/ui/RequiredMark";

// Renders a labeled input on the sign-in and sign-up forms.
export function AuthInput({
  id,
  label,
  error,
  action,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="field">
      <div className="field-row">
        <label className="form-label" htmlFor={id} style={{ marginBottom: 0 }}>
          {label}
          <RequiredMark />
        </label>
        {action}
      </div>
      <input
        id={id}
        className="input-saas"
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
