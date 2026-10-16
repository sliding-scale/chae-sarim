import type { LucideIcon } from "lucide-react";

// Shows one summary chip: a label, an icon, a count, and an optional note.
export function StatCard({
  label,
  value,
  trend,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend?: string;
  tone?: "green" | "blue" | "amber";
  icon?: LucideIcon;
}) {
  return (
    <article className={tone ? `card stat-card is-${tone}` : "card stat-card"}>
      <div className="stat-card-top">
        <p className="card-label">{label}</p>
        {Icon ? (
          <span className="stat-card-icon" aria-hidden="true">
            <Icon size={18} strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <p className="metric-value">{value}</p>
      {trend ? <p className="metric-change">{trend}</p> : null}
    </article>
  );
}
