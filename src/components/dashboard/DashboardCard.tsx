// Wraps one block of dashboard content in a card.
export function DashboardCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="saas-card panel">
      <h2 className="panel-title">{title}</h2>
      {description ? <p className="panel-copy">{description}</p> : null}
      {children}
    </section>
  );
}
