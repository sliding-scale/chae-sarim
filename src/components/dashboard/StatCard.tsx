// Shows one summary number on a dashboard.
export function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <article className="saas-card stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {trend ? <p className="stat-trend">{trend}</p> : null}
    </article>
  );
}
