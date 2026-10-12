const tones = {
  primary: "badge badge-primary",
  success: "badge badge-success",
  warning: "badge badge-warning",
  danger: "badge badge-danger",
  neutral: "badge badge-neutral",
} as const;

// Renders a short colored label.
export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof tones;
  children: string;
}) {
  return <span className={tones[tone]}>{children}</span>;
}

// Picks a badge color from a status label.
export function statusTone(status: string) {
  if (status === "Active" || status === "Completed") return "success" as const;
  if (status === "In progress" || status === "Administrator") return "primary" as const;
  if (status === "Pending") return "warning" as const;
  if (status === "Restricted" || status === "Overdue") return "danger" as const;
  return "neutral" as const;
}
