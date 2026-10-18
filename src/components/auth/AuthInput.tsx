"use client";

import { RequiredMark } from "@/components/ui/RequiredMark";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

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
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && visible ? "text" : type;

  return (
    <div className="field">
      <div className="field-row">
        <label className="form-label is-inline" htmlFor={id}>
          {label}
          <RequiredMark />
        </label>
        {action}
      </div>
      <div className={isPassword ? "password-field" : undefined}>
        <input
          id={id}
          className="input-saas"
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            className="password-toggle"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
