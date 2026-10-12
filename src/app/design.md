# RBAC SaaS Frontend — Design Specification

## 0. Objective

Build a polished, production-quality SaaS frontend for a **2-role RBAC application**.

The application has exactly two roles:

1. **Administrator**
2. **Worker**

Required pages:

1. Landing page
2. Sign in page
3. Sign up page
4. Administrator dashboard
5. Worker dashboard

The visual direction should be **inspired by the SaaSRock aesthetic**: modern SaaS, minimal, clean, premium, spacious, subtle borders, soft neutral backgrounds, and a restrained indigo/purple accent.

This is a design specification, not a request to reproduce SaaSRock's exact UI or branding. Do not copy logos, proprietary illustrations, text, or exact layouts.

---

# 1. Design Principles

### Overall aesthetic

Think:

- Modern B2B SaaS
- Premium but understated
- Clean enterprise software
- Lots of whitespace
- Strong typography
- Soft neutral surfaces
- Subtle 1px borders
- Small shadows
- Rounded but not excessively rounded
- Indigo/purple as the primary brand accent
- Very little visual noise

Avoid:

- Glassmorphism everywhere
- Excessive gradients
- Huge colorful illustrations
- Neon colors
- Excessive shadows
- Extremely rounded "bubble" UI
- Generic Bootstrap-looking dashboards
- Overly dense admin panels

The UI should look like a real SaaS product that could be launched commercially.

---

# 2. Global Design Tokens

Use the provided `global.css` as the source of truth.

## Colors

### Background

Primary page background:

`#FAFAFC`

White surfaces:

`#FFFFFF`

### Text

Primary:

`#18181B`

Secondary:

`#3F3F46`

Muted:

`#71717A`

Subtle:

`#A1A1AA`

### Brand

Primary indigo:

`#5B4EE6`

Hover:

`#4F46D8`

Light brand background:

`#F0EFFF`

Brand text:

`#5146C9`

### Semantic colors

Success:

`#16A34A`

Warning:

`#D97706`

Danger:

`#DC2626`

Info:

`#2563EB`

### Borders

Primary border:

`#E4E4E9`

Secondary border:

`#EEEEF1`

---

# 3. Typography

Use:

- **Manrope** for headings
- **DM Sans** for body/interface text

Typography should feel clean and slightly compact.

## Headings

Use heavy weights for major headings:

- H1: 800
- H2: 700
- H3: 700

Use negative letter spacing on large headings.

## Body

Normal body:

400

UI labels:

500–600

Buttons:

600

Navigation:

500–600

---

# 4. Spacing

Use a consistent 4px-based spacing system.

Preferred values:

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96`

Do not randomly mix spacing values.

---

# 5. Border Radius

Use restrained rounding.

Small controls:

8–9px

Cards:

12–16px

Large hero preview:

18px

Pills/badges:

999px

Avoid 24px+ radius for ordinary cards.

---

# 6. Shadows

Use shadows very sparingly.

Default cards:

Almost no shadow.

Hover:

Small elevation.

Hero/dashboard preview:

More pronounced shadow.

The visual hierarchy should come primarily from:

1. spacing
2. borders
3. typography
4. surface contrast

—not large shadows.

---

# 7. PAGE 1 — LANDING PAGE

## Purpose

Explain the RBAC platform and direct visitors toward authentication.

The landing page should feel like a real SaaS marketing site.

## Header

Desktop:

```text
Logo                    Product   Features   Security   Pricing

                                      Sign in   Get started
```

Logo:

Create a simple text/icon combination.

Example:

`◆ AccessFlow`

Do not use an existing SaaS logo.

Header should be:

- White or transparent over the page background
- 76px tall
- Maximum width around 1180px
- Centered horizontally

Sign in:

Secondary button / text button.

Get started:

Primary indigo button.

---

## Hero

Centered.

Small eyebrow:

`ROLE-BASED ACCESS CONTROL`

Main heading:

`Simple access control for your entire team.`

Use a large bold heading.

Highlight part of the heading with the brand gradient if appropriate.

Supporting text:

Explain that administrators control access while workers get exactly the permissions they need.

Example:

`Manage users, roles, permissions and activity from one simple workspace.`

CTA:

Primary:

`Get started`

Secondary:

`Sign in`

---

## Hero visual

Below the hero, show a large fake dashboard preview.

The preview should visually demonstrate:

- Sidebar
- Dashboard statistics
- Users
- Roles
- Permission indicators
- Recent activity

It should look like a screenshot of the actual application.

Do not use an external image.

Build the preview with actual HTML/CSS components.

---

## Feature section

Three or four feature cards.

Suggested:

### Role-based access

Give every user exactly the access they need.

### Permission management

Control access to application resources.

### Activity tracking

Keep visibility into important account and permission changes.

### Simple administration

Manage users and roles from one workspace.

Use small line icons.

---

## Security section

Create a wide section with:

Eyebrow:

`SECURITY FIRST`

Heading:

`Access control without the complexity.`

Show three items:

- Least privilege
- Centralized permissions
- Audit visibility

---

## Final CTA

Centered card/section:

`Ready to simplify access management?`

Button:

`Create your workspace`

---

## Footer

Simple.

Logo on left.

Links:

- Product
- Security
- Documentation
- Privacy
- Terms

Copyright on bottom.

---

# 8. PAGE 2 — SIGN IN

## Purpose

Clean authentication experience.

The page should NOT look like a dashboard.

Background:

`#FAFAFC`

Center a single auth card.

Card:

- max width: 430px
- white
- subtle border
- subtle shadow
- 16px radius

Top:

Logo centered.

Heading:

`Welcome back`

Description:

`Sign in to access your workspace.`

Fields:

### Email

Placeholder:

`you@company.com`

### Password

Placeholder:

`Enter your password`

Right-aligned:

`Forgot password?`

Primary button:

`Sign in`

Divider:

`OR`

Optional social login buttons can be included if the backend supports them, but do not make them the visual focus.

Bottom:

`Don't have an account? Create one`

Link to sign up.

---

# 9. PAGE 3 — SIGN UP

Use the same visual language as sign in.

Heading:

`Create your workspace`

Description:

`Set up your account and start managing access.`

Fields:

- Full name
- Work email
- Password
- Confirm password

Primary CTA:

`Create account`

Terms text underneath:

`By creating an account, you agree to our Terms and Privacy Policy.`

Bottom:

`Already have an account? Sign in`

Keep the form compact.

Do not introduce unnecessary fields.

---

# 10. AUTHENTICATION UX

The frontend should visually support these states:

### Loading

Button becomes:

`Creating account...`

or

`Signing in...`

Show a small spinner.

### Validation error

Use inline error text below the field.

Do not use large red alert boxes for ordinary validation errors.

### Authentication error

Show a compact alert above the form.

Example:

`Invalid email or password.`

### Success

Redirect to the appropriate dashboard.

---

# 11. PAGE 4 — ADMINISTRATOR DASHBOARD

This is the primary application interface.

Use a desktop SaaS dashboard layout.

## Structure

```text
┌──────────────────────────────────────────────────────────┐
│ Sidebar                  │ Topbar                         │
│                          ├────────────────────────────────│
│ Logo                     │                                │
│                          │ Dashboard                       │
│ Overview                 │                                │
│ Users                    │ Content                        │
│ Roles                    │                                │
│ Permissions              │                                │
│ Audit Logs               │                                │
│                          │                                │
│ Settings                 │                                │
└──────────────────────────────────────────────────────────┘
```

---

# 12. Admin Sidebar

Logo at top.

Navigation:

### Main

- Overview
- Users
- Roles
- Permissions
- Audit Logs

### System

- Settings

Bottom:

User profile.

Example:

```text
Sarah Khan
Administrator
```

Avatar circle.

Active navigation item:

Light indigo background.

Inactive:

Muted gray.

---

# 13. Admin Topbar

Left:

Page title.

Right:

- Notification icon
- Help icon
- User avatar
- User dropdown

Keep topbar minimal.

---

# 14. Admin Overview

Header:

`Good morning, Sarah`

Description:

`Here's what's happening across your workspace.`

Stats row:

### Total users

`248`

### Administrators

`12`

### Workers

`236`

### Active today

`184`

Each stat should be a clean white card.

Include small trend information where appropriate.

Example:

`+8.2% this month`

---

# 15. Admin Dashboard Content

Two-column layout.

Left:

### User activity

Simple chart or activity visualization.

Right:

### Role distribution

Show:

Administrator

`12`

Worker

`236`

Use a simple horizontal visualization or donut.

Do not over-design the charts.

---

# 16. Recent Activity

Full-width card.

Title:

`Recent activity`

Rows:

```text
Sarah Khan
Changed Alex Johnson's role
Administrator → Worker
2 min ago

John Smith
Created a new worker account
8 min ago

Sarah Khan
Updated permission
VIEW_REPORTS
21 min ago
```

Each row should have:

- Avatar
- Actor
- Action
- Metadata
- Time

---

# 17. Users Page / Admin Navigation

Even if only the dashboard is initially required, structure the frontend so these routes can exist:

`/admin/users`

`/admin/roles`

`/admin/permissions`

`/admin/audit-logs`

The sidebar should navigate to them.

The current task does not require fully implementing those pages unless the existing application architecture makes them necessary.

---

# 18. PAGE 5 — WORKER DASHBOARD

The worker dashboard should intentionally be simpler than the admin dashboard.

This difference is important because it demonstrates RBAC visually.

The worker must NOT see:

- Users management
- Roles
- Permissions
- Audit logs
- System settings

The sidebar should contain only:

### Main

- Overview
- My Tasks
- My Profile

Potentially:

- Reports

if that permission exists.

---

# 19. Worker Sidebar

Example:

```text
◆ AccessFlow

MAIN
  Overview
  My Tasks

ACCOUNT
  My Profile

──────────────

Alex Johnson
Worker
```

No admin navigation should appear.

This is a frontend reflection of the authorization model.

Do not merely hide the links with CSS if the application has real backend authorization. The backend must enforce authorization as well.

---

# 20. Worker Overview

Header:

`Welcome back, Alex`

Description:

`Here's your workspace for today.`

Stats:

### Assigned tasks

`12`

### Completed

`8`

### Pending

`4`

### Due today

`2`

These should be less administrative than the admin statistics.

---

# 21. Worker Content

Main card:

### My tasks

Example:

```text
Task                     Status        Due
Review customer request  In progress   Today
Update account details   Pending       Tomorrow
Complete onboarding      Completed     Oct 6
```

Use badges:

Completed → green

In progress → indigo

Pending → neutral

Overdue → red

---

# 22. Worker Activity

Show:

`Recent activity`

Examples:

- Completed onboarding task
- Updated profile
- Submitted report

Keep the worker's view focused on their own activity.

---

# 23. RBAC Visual Rules

The application should make the two roles visibly distinct.

## Administrator

Can see:

- Dashboard
- Users
- Roles
- Permissions
- Audit Logs
- Settings

## Worker

Can see:

- Dashboard
- Own tasks
- Own profile
- Allowed worker resources

The UI should be generated from the authenticated user's role/permissions where practical.

Preferred conceptual pattern:

```ts
user.role === "ADMIN"
```

or preferably permission-based:

```ts
hasPermission("users.read")
```

Use role checks for coarse routing and permission checks for individual capabilities.

---

# 24. Component Architecture

Create reusable components.

Suggested structure:

```text
components/
├── layout/
│   ├── MarketingNavbar
│   ├── MarketingFooter
│   ├── AppSidebar
│   ├── DashboardTopbar
│   └── PageContainer
│
├── auth/
│   ├── AuthCard
│   ├── AuthInput
│   └── AuthError
│
├── dashboard/
│   ├── StatCard
│   ├── ActivityFeed
│   ├── RoleDistribution
│   ├── TaskTable
│   └── DashboardCard
│
├── users/
│   ├── UserAvatar
│   ├── UserStatusBadge
│   └── UserTable
│
└── ui/
    ├── Button
    ├── Badge
    ├── Card
    ├── Input
    ├── Dropdown
    └── Modal
```

Use reusable components instead of duplicating markup.

---

# 25. Responsive Behavior

Desktop is the primary design target.

The application must still work on tablet and mobile.

## Desktop

Sidebar:

248px

## Tablet

Sidebar collapses to icon-only:

72px

## Mobile

Sidebar becomes a drawer.

Topbar remains visible.

Cards stack vertically.

Tables become horizontally scrollable or transform into mobile-friendly cards.

Do not simply shrink desktop layouts until they become unusable.

---

# 26. Iconography

Use Lucide icons if available.

Recommended:

Dashboard:

`LayoutDashboard`

Users:

`Users`

Roles:

`ShieldCheck`

Permissions:

`KeyRound`

Audit logs:

`ScrollText`

Settings:

`Settings`

Notifications:

`Bell`

Search:

`Search`

Tasks:

`ClipboardCheck`

Profile:

`User`

Logout:

`LogOut`

Icons should generally be 16–20px.

Do not use giant decorative icons.

---

# 27. Buttons

Primary:

Indigo background + white text.

Secondary:

White background + subtle border.

Danger:

Use red only for destructive operations.

Button heights:

Small: 36px

Default: 42px

Large: 46–48px

Avoid excessive pill-shaped buttons.

---

# 28. Tables

Tables should be clean and compact.

Header:

small uppercase muted text.

Rows:

white background.

Bottom borders.

Hover:

very subtle background change.

Avoid vertical borders between every column.

---

# 29. Status Badges

Use pills only for statuses.

Examples:

```text
Active          green
Inactive        gray
Administrator   indigo
Worker          neutral
Pending         amber
Completed       green
Restricted      red
```

Do not turn ordinary labels into pills.

---

# 30. Accessibility

Implement:

- Semantic HTML
- Proper form labels
- Keyboard navigation
- Visible focus states
- Sufficient color contrast
- `aria-label` for icon-only buttons
- Buttons should have clear accessible names
- Do not rely only on color to communicate status

---

# 31. Animation

Keep animations subtle.

Use:

- 150–200ms transitions
- Small hover elevation
- Fade/slide for dropdowns
- Drawer transitions

Do NOT add:

- Constant floating animations
- Large page transitions
- Excessive parallax
- Animated gradients everywhere

The product should feel fast and professional.

---

# 32. Important Implementation Rules

1. Use `global.css` as the source of truth for the design tokens.
2. Do not introduce random colors that conflict with the palette.
3. Do not use excessive gradients.
4. Do not use stock images for the dashboard.
5. Build dashboard previews using actual components.
6. Reuse cards, buttons, badges, inputs, and layout components.
7. Keep admin and worker navigation clearly separated.
8. Frontend role visibility is not a security boundary.
9. Backend authorization must independently enforce permissions.
10. Preserve the same visual language across marketing, auth, and application screens.
11. The final result should feel like one coherent SaaS product.
12. Prioritize polish, spacing, typography, and hierarchy over adding unnecessary UI elements.

---

# 33. Required Final Routes

Implement these pages/routes:

```text
/
  Landing page

/sign-in
  Sign in

/sign-up
  Sign up

/admin
  Administrator dashboard

/worker
  Worker dashboard
```

If routing is already established in the project, adapt these paths to the existing router rather than introducing a second routing system.

---

# 34. Final Quality Bar

Before considering the frontend complete, verify:

### Landing

- Looks like a premium SaaS landing page
- Clear CTA
- Dashboard preview looks convincing
- Responsive

### Authentication

- Sign in and sign up visually match
- Forms are polished
- Validation states exist
- Loading states exist

### Admin

- Clearly feels like an administrative control center
- User/role/permission concepts are obvious
- Dashboard has useful information hierarchy
- Sidebar is polished

### Worker

- Clearly simpler than admin
- Only worker-appropriate navigation is visible
- Tasks/work are the primary focus

### Overall

- Consistent typography
- Consistent spacing
- Consistent colors
- Consistent border radius
- Consistent iconography
- No random UI patterns
- No placeholder-looking components
- No excessive visual effects

The finished UI should be suitable for a portfolio project and should look like a real commercial SaaS application.
