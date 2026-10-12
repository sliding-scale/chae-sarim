import { AuthLink } from "@/components/auth/AuthLink";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ScrollText, ShieldCheck, Users } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Role-based access",
    body: "Give every user exactly the access they need.",
  },
  {
    icon: KeyRound,
    title: "Permission management",
    body: "Control access to application resources.",
  },
  {
    icon: ScrollText,
    title: "Activity tracking",
    body: "Keep visibility into important account and permission changes.",
  },
  {
    icon: Users,
    title: "Simple administration",
    body: "Manage users and roles from one dashboard.",
  },
];

const security = [
  {
    title: "Least privilege",
    body: "Workers see their own tasks. Administrators manage the dashboard.",
  },
  {
    title: "Centralized permissions",
    body: "Roles and resource access live in one place, not scattered settings.",
  },
  {
    title: "Audit visibility",
    body: "Role changes, new accounts, and permission updates stay visible.",
  },
];

// Renders the public marketing page.
export function LandingPage() {
  return (
    <div className="page-shell">
      <MarketingNavbar />
      <main>
        <section className="hero-section">
          <div className="container-saas">
            <p className="eyebrow">Role-based access control</p>
            <h1 className="hero-title">
              Simple <span className="text-gradient">access control</span> for your entire team.
            </h1>
            <p className="hero-description">
              Administrators control access while workers get exactly the permissions they need.
              Manage users, roles, permissions and activity from one simple dashboard.
            </p>
            <div className="hero-actions">
              <AuthLink className="btn-primary btn-lg" href="/sign-up">
                Get started
              </AuthLink>
              <AuthLink className="btn-secondary btn-lg" href="/sign-in">
                Sign in
              </AuthLink>
            </div>
            <div className="hero-dashboard-preview" aria-hidden="true">
              <div className="preview-frame">
                <div className="dashboard-shell">
                  <aside className="app-sidebar preview-sidebar">
                    <div className="sidebar-logo">
                      <span className="logo">
                        <span className="logo-mark">◆</span>
                        <span className="logo-word">Chae</span>
                      </span>
                    </div>
                    <div className="sidebar-nav">
                      <p className="sidebar-section-label">Main</p>
                      <div className="sidebar-link sidebar-link-active">Overview</div>
                      <div className="sidebar-link">Users</div>
                      <div className="sidebar-link">Roles</div>
                      <div className="sidebar-link">Permissions</div>
                      <div className="sidebar-link">Audit Logs</div>
                      <p className="sidebar-section-label">System</p>
                      <div className="sidebar-link">Settings</div>
                    </div>
                  </aside>
                  <div className="dashboard-main">
                    <div className="dashboard-topbar">
                      <strong>Overview</strong>
                      <Badge tone="primary">Administrator</Badge>
                    </div>
                    <div className="dashboard-content">
                      <div className="stats-grid">
                        <StatCard label="Total users" value="248" trend="+8.2% this month" />
                        <StatCard label="Administrators" value="12" />
                        <StatCard label="Workers" value="236" />
                        <StatCard label="Active today" value="184" />
                      </div>
                      <div className="stack">
                        <section className="saas-card panel">
                          <h2 className="panel-title">Recent activity</h2>
                          <ActivityFeed
                            items={[
                              {
                                id: "1",
                                actor: "Sarah Khan",
                                action: "Changed Alex Johnson's role",
                                meta: "Administrator → Worker",
                                time: "2 min ago",
                              },
                              {
                                id: "2",
                                actor: "John Smith",
                                action: "Created a new worker account",
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
              <h2>Everything a small team needs to manage access.</h2>
              <p className="section-copy">
                Two roles, clear permissions, and a record of what changed.
              </p>
            </div>
            <div className="feature-grid" style={{ marginTop: 32 }}>
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
              <p className="eyebrow">Security first</p>
              <h2>Access control without the complexity.</h2>
              <div className="security-grid">
                {security.map((item) => (
                  <article key={item.title} className="security-card">
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="pricing" style={{ paddingTop: 0 }}>
          <div className="container-saas">
            <div className="section-heading">
              <p className="eyebrow">Pricing</p>
              <h2>One dashboard. Two roles.</h2>
              <p className="section-copy">
                Administrators run the company. Workers join by invite and see only their own work.
              </p>
            </div>
            <div className="pricing-grid" style={{ marginTop: 28 }}>
              <article className="saas-card pricing-card">
                <h3>Administrator</h3>
                <p>Create the company, invite workers, and review users, roles, and activity.</p>
              </article>
              <article className="saas-card pricing-card">
                <h3>Worker</h3>
                <p>Sign in with an invite and work from a smaller dashboard built around your tasks.</p>
              </article>
              <article className="saas-card pricing-card">
                <h3>No extra tiers</h3>
                <p>Access stays on these two roles. There is no third permission level to configure.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="cta-wrap">
          <div className="container-saas">
            <div className="saas-card cta-card">
              <h2>Ready to simplify access management?</h2>
              <AuthLink className="btn-primary btn-lg" href="/sign-up">
                Create your dashboard
              </AuthLink>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
