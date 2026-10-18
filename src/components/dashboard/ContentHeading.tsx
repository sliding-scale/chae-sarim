// Renders the title, and an optional description, at the top of a dashboard content page.
export function ContentHeading({ title, description }: { title: string; description?: string }) {
  return (
    <header className="content-heading">
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
