"use client";

import { AuthLink } from "@/components/auth/AuthLink";
import { ChaeMark } from "@/components/brand/ChaeMark";
import { UserAvatar } from "@/components/users/UserAvatar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { useAuth } from "@clerk/nextjs";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarOff,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  MoonIcon,
  SunIcon,
  Users,
} from "lucide-react";
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
                        <div className="sidebar-link sidebar-link-active">
                          <LayoutDashboard size={16} aria-hidden="true" />
                          <span>Overview</span>
                        </div>
                        <div className="sidebar-link">
                          <Users size={16} aria-hidden="true" />
                          <span>Workers</span>
                        </div>
                        <div className="sidebar-link">
                          <MapPin size={16} aria-hidden="true" />
                          <span>Job sites</span>
                        </div>
                      </div>
                      <div>
                        <p className="sidebar-section-label">Review</p>
                        <div className="sidebar-link">
                          <ClipboardList size={16} aria-hidden="true" />
                          <span>Timesheets</span>
                        </div>
                        <div className="sidebar-link">
                          <FileText size={16} aria-hidden="true" />
                          <span>Invoices</span>
                        </div>
                        <div className="sidebar-link">
                          <CalendarOff size={16} aria-hidden="true" />
                          <span>Holidays</span>
                        </div>
                      </div>
                    </div>
                    <div className="sidebar-footer">
                      <div className="sidebar-theme">
                        <div className="theme-switch">
                          <span className="theme-switch-control" />
                          <span className="theme-switch-icon theme-switch-icon-sun">
                            <SunIcon size={16} className="theme-switch-sun" />
                          </span>
                          <span className="theme-switch-icon theme-switch-icon-moon">
                            <MoonIcon size={16} className="theme-switch-moon" />
                          </span>
                          <span data-slot="switch-thumb" />
                        </div>
                      </div>
                      <span className="sidebar-account-button">
                        <UserAvatar name="Amina Rahman" />
                        <span className="sidebar-footer-copy">
                          <strong>Amina Rahman</strong>
                          <span>Administrator</span>
                        </span>
                        <ChevronUp className="sidebar-footer-chevron" size={16} aria-hidden="true" />
                      </span>
                    </div>
                  </aside>
                  <div className="dashboard-main">
                    <div className="dashboard-content">
                      <div className="home-admin">
                        <header className="home-greeting">
                          <h1>
                            Good morning, Amina! <span className="home-wave">👋</span>
                          </h1>
                          <p>Here&apos;s what&apos;s happening across your team.</p>
                        </header>
                        <section className="home-stats">
                          <article className="home-stat is-green">
                            <span className="home-bubble"><MapPin aria-hidden="true" /></span>
                            <p>Total job sites</p>
                            <strong>6</strong>
                            <a tabIndex={-1} href="/dashboard/admin/job-sites">
                              View job sites <ArrowRight aria-hidden="true" />
                            </a>
                          </article>
                          <article className="home-stat is-green">
                            <span className="home-bubble"><ClipboardList aria-hidden="true" /></span>
                            <p>Pending timesheets</p>
                            <strong>4</strong>
                            <a tabIndex={-1} href="/dashboard/admin/timesheets">
                              View timesheets <ArrowRight aria-hidden="true" />
                            </a>
                          </article>
                          <article className="home-stat is-amber">
                            <span className="home-bubble"><FileText aria-hidden="true" /></span>
                            <p>Pending invoices</p>
                            <strong>3</strong>
                            <a tabIndex={-1} href="/dashboard/admin/invoices">
                              View invoices <ArrowRight aria-hidden="true" />
                            </a>
                          </article>
                          <article className="home-stat is-green">
                            <span className="home-bubble"><CalendarOff aria-hidden="true" /></span>
                            <p>Pending holidays</p>
                            <strong>2</strong>
                            <a tabIndex={-1} href="/dashboard/admin/holidays">
                              View holidays <ArrowRight aria-hidden="true" />
                            </a>
                          </article>
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
                              <a className="home-view-all" tabIndex={-1} href="/dashboard/admin/workers">
                                View all <ArrowRight aria-hidden="true" />
                              </a>
                            </header>
                            <div className="home-members">
                              {[
                                ["Maya Chen", "North warehouse"],
                                ["James Okonkwo", "Riverside depot"],
                                ["Priya Shah", "City clinic"],
                              ].map(([name, sites]) => (
                                <a key={name} className="home-member" tabIndex={-1} href="/dashboard/admin/workers">
                                  <UserAvatar name={name} />
                                  <span className="home-member-copy">
                                    <strong>{name}</strong>
                                    <span>{sites}</span>
                                  </span>
                                  <ChevronRight aria-hidden="true" />
                                </a>
                              ))}
                            </div>
                            <a className="home-more" tabIndex={-1} href="/dashboard/admin/workers">
                              <span>
                                <Users aria-hidden="true" />
                                2 more team members
                              </span>
                              <ChevronRight aria-hidden="true" />
                            </a>
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
                              <a className="home-week" tabIndex={-1} href="/dashboard/admin/invoices?status=approved">
                                <span><FileText aria-hidden="true" /></span>
                                <p>Invoices approved</p>
                                <strong>5</strong>
                              </a>
                              <a className="home-week" tabIndex={-1} href="/dashboard/admin/timesheets?status=approved">
                                <span><ClipboardList aria-hidden="true" /></span>
                                <p>Timesheets approved</p>
                                <strong>8</strong>
                              </a>
                              <a className="home-week" tabIndex={-1} href="/dashboard/admin/holidays?status=approved">
                                <span><CalendarOff aria-hidden="true" /></span>
                                <p>Holidays approved</p>
                                <strong>1</strong>
                              </a>
                            </div>
                          </article>
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

        <section id="how-it-works">
          <div className="container-saas">
            <div className="security-band">
              <p className="eyebrow">How it works</p>
              <h2>Sites are assigned. Records wait for review.</h2>
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

        <section className="section" id="roles">
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
                <h3>Administrator</h3>
                <p>Add job sites, invite workers, and approve timesheets, invoices, and holidays.</p>
              </article>
              <article className="saas-card pricing-card">
                <h3>Worker</h3>
                <p>Submit hours, upload invoices, and request a holiday for assigned job sites.</p>
              </article>
              <article className="saas-card pricing-card">
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
