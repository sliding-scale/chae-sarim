"use client";

import { useWorkspace } from "@/components/layout/RoleGate";
import { UserAvatar } from "@/components/users/UserAvatar";
import { homeWindow } from "@/lib/home-window";
import { useGreeting } from "@/lib/use-greeting";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight, BarChart3, CalendarOff, ChevronRight, ClipboardList, FileText, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Shows company totals, the team, and this week's approvals for the signed-in admin.
export function AdminDashboardPage() {
  const workspace = useWorkspace();
  const greeting = useGreeting(workspace.name);
  const [windowArgs, setWindowArgs] = useState<ReturnType<typeof homeWindow> | null>(null);
  useEffect(() => {
    setWindowArgs(homeWindow());
  }, []);
  const home = useQuery(api.dashboard.queries.getAdminHome, windowArgs ?? "skip");
  const extra = home ? Math.max(home.workerCount - home.team.length, 0) : 0;

  return (
    <div className="home-admin">
      <header className="home-greeting">
        <h1 suppressHydrationWarning>
          {greeting}! <span className="home-wave">👋</span>
        </h1>
        <p>Here&apos;s what&apos;s happening across your team.</p>
      </header>

      <section className="home-stats" aria-label="Dashboard summary">
        <HomeStat
          tone="green"
          icon={MapPin}
          label="Total job sites"
          value={home ? String(home.jobSites) : "—"}
          href="/dashboard/admin/job-sites"
          link="View job sites"
        />
        <HomeStat
          tone="green"
          icon={ClipboardList}
          label="Pending timesheets"
          value={home ? String(home.pendingTimesheets) : "—"}
          href="/dashboard/admin/timesheets"
          link="View timesheets"
        />
        <HomeStat
          tone="green"
          icon={FileText}
          label="Pending invoices"
          value={home ? String(home.pendingInvoices) : "—"}
          href="/dashboard/admin/invoices"
          link="View invoices"
        />
        <HomeStat
          tone="green"
          icon={CalendarOff}
          label="Pending holidays"
          value={home ? String(home.pendingHolidays) : "—"}
          href="/dashboard/admin/holidays"
          link="View holidays"
        />
      </section>

      <section className="home-panels">
        <article className="home-panel">
          <header className="home-panel-header">
            <div className="home-heading-group">
              <span className="home-round">
                <Users aria-hidden="true" />
              </span>
              <div>
                <h2>Your team</h2>
                <p>Quick overview of your team members and their assigned job sites.</p>
              </div>
            </div>
            <Link className="home-view-all" href="/dashboard/admin/workers">
              View all <ArrowRight aria-hidden="true" />
            </Link>
          </header>
          {home === undefined ? (
            <p className="home-note">Loading your team…</p>
          ) : home.team.length === 0 ? (
            <p className="home-note">No workers have joined yet.</p>
          ) : (
            <div className="home-members">
              {home.team.map((member) => (
                <Link key={member.email} className="home-member" href="/dashboard/admin/workers">
                  <UserAvatar name={member.name} imageUrl={member.imageUrl} />
                  <span className="home-member-copy">
                    <strong>{member.name}</strong>
                    <span>{member.sites || "No job sites yet"}</span>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
          {extra > 0 ? (
            <Link className="home-more" href="/dashboard/admin/workers">
              <span>
                <Users aria-hidden="true" />
                {extra === 1 ? "1 more team member" : `${extra} more team members`}
              </span>
              <ChevronRight aria-hidden="true" />
            </Link>
          ) : null}
        </article>

        <article className="home-panel">
          <header className="home-panel-header">
            <div className="home-heading-group">
              <span className="home-round">
                <BarChart3 aria-hidden="true" />
              </span>
              <div>
                <h2>This week</h2>
                <p>Approved this week</p>
              </div>
            </div>
          </header>
          <div className="home-weekly">
            <WeekStat
              href="/dashboard/admin/invoices?status=approved"
              icon={FileText}
              label="Invoices approved"
              value={home ? String(home.approvedInvoices) : "—"}
            />
            <WeekStat
              href="/dashboard/admin/timesheets?status=approved"
              icon={ClipboardList}
              label="Timesheets approved"
              value={home ? String(home.approvedTimesheets) : "—"}
            />
            <WeekStat
              href="/dashboard/admin/holidays?status=approved"
              icon={CalendarOff}
              label="Holidays approved"
              value={home ? String(home.approvedHolidays) : "—"}
            />
          </div>
        </article>
      </section>
    </div>
  );
}

// Shows one coloured summary card on the admin dashboard.
function HomeStat({
  tone,
  icon: Icon,
  label,
  value,
  href,
  link,
}: {
  tone: "blue" | "green" | "amber" | "purple";
  icon: typeof Users;
  label: string;
  value: string;
  href: string;
  link: string;
}) {
  return (
    <article className={`home-stat is-${tone}`}>
      <span className="home-bubble">
        <Icon aria-hidden="true" />
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
      <Link href={href}>
        {link} <ArrowRight aria-hidden="true" />
      </Link>
    </article>
  );
}

// Links one approved-this-week total to that list with Approved already selected.
function WeekStat({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Link className="home-week" href={href}>
      <span>
        <Icon aria-hidden="true" />
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
    </Link>
  );
}
