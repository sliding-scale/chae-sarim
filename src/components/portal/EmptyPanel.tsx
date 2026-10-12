// Shows a title and explanation when a list has no rows yet.
export function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="saas-card empty-panel">
      <h2 className="panel-title">{title}</h2>
      <p className="panel-copy">{body}</p>
    </section>
  );
}
