"use client";

import { AuthLink } from "@/components/auth/AuthLink";
import { ChaeMark } from "@/components/brand/ChaeMark";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@clerk/nextjs";
import { Building2, CalendarOff, ClipboardList, FileText, MapPin } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: MapPin,
    title: "Job sites",
    body: "Add the places people work, then choose which workers can submit records there.",
  },
  {
    icon: ClipboardList,
    title: "Timesheets",
    body: "Workers send in weekly hours. An administrator approves or rejects each week.",
  },
  {
    icon: FileText,
    title: "Invoices",
    body: "Workers upload a PDF or image for a month. An administrator reviews the amount.",
  },
  {
    icon: CalendarOff,
    title: "Holidays",
    body: "Workers request a holiday. An administrator approves or rejects the dates.",
  },
];

const roles = [
  {
    icon: MapPin,
    title: "Assigned sites",
    body: "A worker submits timesheets, invoices, and holidays only for job sites an administrator assigns.",
  },
  {
    icon: ClipboardList,
    title: "A review step",
    body: "Hours, invoices, and holidays stay pending until an administrator approves or rejects them.",
  },
  {
    icon: Building2,
    title: "One company",
    body: "A new account creates a company. An email invite adds a worker to that company.",
  },
];

// Shows Get started, or Open dashboard once someone is already signed in.
function LandingActions({ prominent = false }: { prominent?: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) {
    return (
      <Link className="btn-primary btn-lg" href="/dashboard">
        Open dashboard
      </Link>
    );
  }
  return (
    <>
      <AuthLink className="btn-primary btn-lg" href="/sign-up">
        Get started
      </AuthLink>
      {prominent ? (
        <AuthLink className="btn-secondary btn-lg" href="/sign-in">
          Sign in
        </AuthLink>
      ) : null}
    </>
  );
}

// Renders the public marketing page.
export function LandingPage() {
  return (
    <div className="page-shell landing-page">
      <MarketingNavbar />
      <main>
        <section className="hero-section">
          <div className="container-saas">
            <p className="eyebrow">For field teams</p>
            <h1 className="hero-title">
              Job sites, timesheets, invoices, and <span className="text-gradient">holidays</span> in one place.
            </h1>
            <p className="hero-description">
              Administrators add sites, invite workers, and review what comes in. Workers submit hours,
              invoices, and holidays for the sites they are assigned.
            </p>
            <div className="hero-actions">
              <LandingActions prominent />
            </div>
            <div className="hero-dashboard-preview" aria-hidden="true">
              <div className="preview-frame">
                <div className="dashboard-shell">
                  <aside className="app-sidebar preview-sidebar">
                    <div className="sidebar-brand">
                      <span className="sidebar-brand-name">
                        <ChaeMark className="sidebar-brand-mark" />
                        <span>Chae</span>
                      </span>
                    </div>
                    <div className="sidebar-workspace">
                      <span className="sidebar-workspace-mark" aria-hidden="true">
                        <Building2 size={18} />
                      </span>
                      <span className="sidebar-workspace-copy">
                        <span>Workspace</span>
                        <strong>Northwind</strong>
                      </span>
                    </div>
                    <div className="sidebar-nav">
                      <div>
                        <p className="sidebar-section-label">Company</p>
                        <div className="sidebar-link sidebar-link-active">Overview</div>
                        <div className="sidebar-link">Workers</div>
                        <div className="sidebar-link">Job sites</div>
                      </div>
                      <div>
                        <p className="sidebar-section-label">Review</p>
                        <div className="sidebar-link">Timesheets</div>
                        <div className="sidebar-link">Invoices</div>
                        <div className="sidebar-link">Holidays</div>
                      </div>
                    </div>
                    <div className="sidebar-footer">
                      <span className="sidebar-account-button">
                        <span className="avatar is-tone-1" aria-hidden="true">AR</span>
                        <span className="sidebar-footer-copy">
                          <strong>Amina Rahman</strong>
                          <span>Administrator</span>
                        </span>
                      </span>
                    </div>
                  </aside>
                  <div className="dashboard-main">
                    <div className="dashboard-topbar">
                      <strong className="dashboard-title">Overview</strong>
                      <Badge tone="primary">Administrator</Badge>
                    </div>
                    <div className="dashboard-content">
                      <section className="home-stats">
                        <article className="home-stat is-green">
                          <span className="home-bubble"><MapPin aria-hidden="true" /></span>
                          <p>Job sites</p>
                          <strong>6</strong>
                          <small>Places your team works</small>
                        </article>
                        <article className="home-stat is-green">
                          <span className="home-bubble"><ClipboardList aria-hidden="true" /></span>
                          <p>Pending timesheets</p>
                          <strong>4</strong>
                          <small>Waiting for review</small>
                        </article>
                        <article className="home-stat is-green">
                          <span className="home-bubble"><FileText aria-hidden="true" /></span>
                          <p>Pending invoices</p>
                          <strong>3</strong>
                          <small>Waiting for review</small>
                        </article>
                        <article className="home-stat is-green">
                          <span className="home-bubble"><CalendarOff aria-hidden="true" /></span>
                          <p>Pending holidays</p>
                          <strong>2</strong>
                          <small>Waiting for review</small>
                        </article>
                      </section>
                      <div className="stack">
                        <section className="saas-card feed-card">
                          <header className="feed-card-heading">
                            <h2 className="panel-title">Recent activity</h2>
                            <p>Latest updates from your team</p>
                          </header>
                          <ActivityFeed
                            items={[
                              {
                                id: "1",
                                actor: "Maya Chen",
                                action: "submitted a timesheet",
                                meta: "North warehouse · 37.5h",
                                time: "2 min ago",
                              },
                              {
                                id: "2",
                                actor: "James Okonkwo",
                                action: "uploaded an invoice",
                                meta: "March · PKR 1,240.00",
                                time: "8 min ago",
                              },
                            ]}
                          />
                        </section>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="product">
          <div className="container-saas">
            <div className="section-heading" id="features">
              <p className="eyebrow">Product</p>
              <h2>The records a company already keeps.</h2>
              <p className="section-copy">
                Job sites, weekly hours, invoices, and holidays, with a review before anything is approved.
              </p>
            </div>
            <div className="feature-grid">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="saas-card saas-card-hover feature-card">
                    <span className="feature-icon">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3>{feature.title}</h3>
                    <p>{feature.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="security">
          <div className="container-saas">
            <div className="security-band">
              <p className="eyebrow">Two roles</p>
              <h2>Administrators review. Workers submit their own.</h2>
              <div className="security-grid">
                {roles.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.title} className="security-card">
                      <span className="feature-icon">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="pricing">
          <div className="container-saas">
            <div className="section-heading">
              <p className="eyebrow">Roles</p>
              <h2>An administrator and the workers they invite.</h2>
              <p className="section-copy">
                One company dashboard. Workers join by invite and see only their own work.
              </p>
            </div>
            <div className="pricing-grid">
              <article className="saas-card pricing-card">
                <p className="eyebrow">No charge</p>
                <h3>Administrator</h3>
                <p>Add job sites, invite workers, and approve timesheets, invoices, and holidays.</p>
              </article>
              <article className="saas-card pricing-card">
                <p className="eyebrow">No charge</p>
                <h3>Worker</h3>
                <p>Submit hours, upload invoices, and request a holiday for assigned job sites.</p>
              </article>
              <article className="saas-card pricing-card">
                <p className="eyebrow">No charge</p>
                <h3>Same company</h3>
                <p>Everyone in the account shares one company. There is no extra permission tier.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="cta-wrap">
          <div className="container-saas">
            <div className="saas-card cta-card">
              <h2>Ready to set up your company?</h2>
              <LandingActions />
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
