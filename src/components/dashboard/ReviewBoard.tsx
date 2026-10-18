import { ClipboardList, Clock3, CircleCheck, CircleX } from "lucide-react";
import type { ReactNode } from "react";

type ReviewRow = { status: "pending" | "approved" | "rejected" };

// Shows the four review totals and the submitted-records card from the admin designs.
export function ReviewBoard({
  title,
  noun,
  rows,
  error,
  children,
}: {
  title: string;
  noun: string;
  rows: ReviewRow[] | undefined;
  error?: string;
  children: ReactNode;
}) {
  const total = rows?.length;
  const pending = rows?.filter((row) => row.status === "pending").length;
  const approved = rows?.filter((row) => row.status === "approved").length;
  const rejected = rows?.filter((row) => row.status === "rejected").length;

  return (
    <div className="admin-review">
      <section className="home-stats" aria-label={`${title} summary`}>
        <Metric icon={ClipboardList} tone="blue" label="Total Submitted" value={total} note={`${noun} this period`} />
        <Metric icon={Clock3} tone="amber" label="Pending Review" value={pending} note="awaiting approval" />
        <Metric icon={CircleCheck} tone="green" label="Approved" value={approved} note={`${noun} approved`} />
        <Metric icon={CircleX} tone="rose" label="Rejected" value={rejected} note={`${noun} rejected`} />
      </section>
      <section className="admin-table-card">
        <header className="admin-card-heading">
          <h2>{title}</h2>
          <span className="admin-pending">
            <Clock3 size={16} aria-hidden="true" />
            {pending === undefined ? "—" : pending === 1 ? "1 pending" : `${pending} pending`}
          </span>
        </header>
        {error ? <p className="field-error">{error}</p> : null}
        {children}
      </section>
    </div>
  );
}

// Shows one coloured total on a review page.
function Metric({
  icon: Icon,
  tone,
  label,
  value,
  note,
}: {
  icon: typeof ClipboardList;
  tone: "blue" | "green" | "amber" | "rose";
  label: string;
  value: number | undefined;
  note: string;
}) {
  return (
    <article className={`home-stat is-${tone}`}>
      <span className="home-bubble">
        <Icon aria-hidden="true" />
      </span>
      <p>{label}</p>
      <strong>{value === undefined ? "—" : String(value)}</strong>
      <small>{note}</small>
    </article>
  );
}
