"use client";

import { useWorkspace } from "@/components/layout/RoleGate";
import { homeWindow } from "@/lib/home-window";
import { useGreeting } from "@/lib/use-greeting";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { CalendarOff, ClipboardList, Clock3, FileText, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const siteTones = ["green", "blue", "amber", "purple"] as const;

type ActivityStatus = "draft" | "pending" | "approved" | "rejected" | null;

// Shows the signed-in worker's shortcuts, job sites, and this month.
export function WorkerDashboardPage() {
  const workspace = useWorkspace();
  const greeting = useGreeting(workspace.name);
  const [month, setMonth] = useState<string | null>(null);
  useEffect(() => {
    setMonth(homeWindow().month);
  }, []);
  const home = useQuery(api.dashboard.queries.getWorkerHome, month ? { month } : "skip");
  const holidayDays = home?.holidayDays ?? 0;

  return (
    <div className="home-worker">
      <header className="home-greeting">
        <h1 suppressHydrationWarning>
          {greeting}! <span className="home-wave">👋</span>
        </h1>
        <p>Here&apos;s your overview for this month.</p>
      </header>

      <section className="home-stats" aria-label="Quick actions">
        <Link className="home-stat is-green" href="/dashboard/worker/timesheets">
          <span className="home-bubble">
            <ClipboardList aria-hidden="true" />
          </span>
          <p>Submit a timesheet</p>
          <small>Record your hours for approval</small>
        </Link>
        <Link className="home-stat" href="/dashboard/worker/invoices">
          <span className="home-bubble">
            <FileText aria-hidden="true" />
          </span>
          <p>Upload an invoice</p>
          <small>Add your invoice for review</small>
        </Link>
        <Link className="home-stat is-amber" href="/dashboard/worker/holidays">
          <span className="home-bubble">
            <CalendarOff aria-hidden="true" />
          </span>
          <p>Request a holiday</p>
          <small>Ask for days away from a job site</small>
        </Link>
      </section>

      <section className="home-lower">
        <article className="home-panel">
          <header className="home-panel-header">
            <div className="home-heading-group">
              <span className="home-round">
                <MapPin aria-hidden="true" />
              </span>
              <h2>Your job sites</h2>
            </div>
          </header>
          {home === undefined ? (
            <p className="home-note">Loading job sites…</p>
          ) : home.sites.length === 0 ? (
            <p className="home-note">Assigned job sites will appear here.</p>
          ) : (
            <div className="home-site-list">
              {home.sites.map((site) => (
                <span key={site.jobSiteId} className="home-site-pill">
                  <i className={`is-${siteTone(site.name)}`} />
                  {site.name}
                </span>
              ))}
            </div>
          )}
        </article>
        <article className="home-panel">
          <header className="home-panel-header">
            <div className="home-heading-group">
              <span className="home-round">
                <ClipboardList aria-hidden="true" />
              </span>
              <h2>Recent activity</h2>
            </div>
          </header>
          <ActivityRow tone="timesheet" icon={ClipboardList} label="Timesheet" status={home?.timesheetStatus ?? null} ready={home !== undefined} />
          <ActivityRow tone="invoice" icon={FileText} label="Invoice" status={home?.invoiceStatus ?? null} ready={home !== undefined} />
          <ActivityRow tone="holiday" icon={CalendarOff} label="Holiday" status={home?.holidayStatus ?? null} ready={home !== undefined} />
        </article>
        <article className="home-panel">
          <header className="home-panel-header">
            <div className="home-heading-group">
              <span className="home-round">
                <Clock3 aria-hidden="true" />
              </span>
              <h2>This month</h2>
            </div>
          </header>
          <SummaryRow
            tone="hours"
            icon={Clock3}
            label="Hours logged"
            value={home ? `${Number(home.hoursLogged.toFixed(2))} h` : "—"}
          />
          <SummaryRow
            tone="invoice"
            icon={FileText}
            label="Invoices submitted"
            value={home ? String(home.invoicesSubmitted) : "—"}
          />
          <SummaryRow
            tone="holiday"
            icon={CalendarOff}
            label="Holiday days"
            value={home ? (holidayDays === 1 ? "1 day" : `${holidayDays} days`) : "—"}
          />
        </article>
      </section>
    </div>
  );
}

// Picks a stable pill colour from the site name so it does not change with list order.
function siteTone(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % siteTones.length;
  return siteTones[hash];
}

// Turns the latest submission status into a short activity line.
function activityText(status: ActivityStatus) {
  if (status === "draft") return "Draft saved";
  if (status === "pending") return "Waiting for review";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Nothing submitted yet";
}

// Shows the latest status for one kind of worker record.
function ActivityRow({
  tone,
  icon: Icon,
  label,
  status,
  ready,
}: {
  tone: "timesheet" | "invoice" | "holiday";
  icon: typeof FileText;
  label: string;
  status: ActivityStatus;
  ready: boolean;
}) {
  return (
    <div className={`home-activity is-${tone}`}>
      <span>
        <Icon aria-hidden="true" />
      </span>
      <strong>{label}</strong>
      <small>{ready ? activityText(status) : "—"}</small>
    </div>
  );
}

// Shows one number in the worker's monthly summary.
function SummaryRow({
  tone,
  icon: Icon,
  label,
  value,
}: {
  tone: "hours" | "invoice" | "holiday";
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className={`home-summary is-${tone}`}>
      <span>
        <Icon aria-hidden="true" />
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
