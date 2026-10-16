# AeuxGlobal-Inspired Dashboard Design System

> **Reference:** A screenshot of an environmental analytics dashboard shared by the user.
>
> **Important:** This is a design reconstruction based on a flattened screenshot. Colors, measurements, font choices, and responsive behavior are approximations; the original source code and exact design tokens are not available.

## Design intent

Create a calm, data-dense environmental analytics interface. Use a deep-green navigation area to establish brand identity, a pale neutral canvas to keep information legible, white cards to group related metrics, and vivid green to emphasize positive trends and data series.

## Design principles

1. **Hierarchy through contrast:** dark navigation, light workspace, and high-contrast KPI values.
2. **Cards as containers:** group related metrics and visualizations in white, softly bordered cards.
3. **Consistent spacing:** use the spacing tokens rather than one-off margins.
4. **Data-first typography:** keep labels small and muted; make values prominent and use tabular numerals for metrics.
5. **Purposeful color:** green is the primary accent; red is reserved for negative changes and alerts.
6. **Responsive by default:** preserve readability on small screens instead of scaling the desktop canvas down.

## Color tokens

| Token | Value | Intended use |
|---|---|---|
| `--color-brand-950` | `#0B2817` | Deepest sidebar/background green |
| `--color-brand-900` | `#103C24` | Sidebar and primary buttons |
| `--color-brand-800` | `#14502C` | Hover states on dark surfaces |
| `--color-brand-700` | `#17723A` | Links and positive text |
| `--color-accent-500` | `#19B94B` | Main chart series and accent |
| `--color-accent-400` | `#36D365` | Brighter highlights |
| `--color-accent-100` | `#DFF5E4` | Soft green badges |
| `--color-green-muted` | `#DCEBDD` | Highlight panels |
| `--color-page` | `#F4F7F4` | Main workspace canvas |
| `--color-surface` | `#FFFFFF` | Cards and controls |
| `--color-surface-muted` | `#EDF3EE` | Neutral chips and hover surfaces |
| `--color-border` | `#E2E9E3` | Subtle borders and dividers |
| `--color-text` | `#26352B` | Primary text |
| `--color-text-muted` | `#78847B` | Secondary labels |
| `--color-text-inverse` | `#F6FBF7` | Text on dark surfaces |
| `--color-danger` | `#D45D62` | Negative trends and errors |
| `--color-warning` | `#DCA54B` | Warnings |
| `--color-info` | `#6B9ED1` | Informational states |

The values are suggested visual matches, not verified pixel samples from the original design.

## Typography

- **Font:** Inter, with system sans-serif fallbacks.
- **Dashboard title:** 24px, weight 700, tight letter spacing.
- **Card titles:** 14px, weight 600.
- **Body text:** 14px, weight 400.
- **Supporting labels:** 11–13px, muted color.
- **KPI values:** 24–32px, weight 500, tight letter spacing.
- **Numerical data:** use `font-variant-numeric: tabular-nums` where alignment matters.

Keep labels concise and avoid using bold text for every element. Reserve the strongest weights for titles, important values, and selected navigation items.

## Spacing and layout

The stylesheet uses a 4px-based spacing scale:

| Token | Value |
|---|---:|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

Suggested desktop layout:

- Sidebar: approximately 224px wide.
- Main canvas: remaining viewport width.
- Main padding: 16–28px depending on viewport.
- Grid gap: 14–16px.
- Cards: 16–20px internal padding.
- Main card radius: 16px.
- Controls: 8–10px radius.

## Components

### Application shell
A two-column grid containing the sidebar and the main workspace. On desktop the sidebar remains sticky while the main area can grow vertically.

### Sidebar
Deep green gradient, light logo and navigation text, muted section labels, and a subtle translucent background on hover or the current page. Keep settings and profile actions toward the bottom when space permits.

### Dashboard header
Title on the left; notifications and the primary action on the right. Allow the header to wrap or stack on narrow screens.

### Metric card
A small muted label, prominent numeric value, optional unit, trend indicator, and optional sparkline. Keep metric values aligned and avoid excessive decoration.

### Standard card
White background, subtle border, 16px radius, and restrained shadow. Cards should not depend on shadow alone for separation.

### Badge
Pill-shaped label for region filters, categories, or status. Use soft green for positive or selected states and neutral gray-green for ordinary metadata.

### Primary button
Dark-green background, white label, 8px radius. Use a slightly lighter green on hover and provide a visible keyboard focus ring.

### Charts
Use pale gridlines and muted historical series. Use accent green to highlight the active or important data series. Pair color with labels, values, or other cues so meaning is not conveyed by color alone.

### Data table
Compact headings, thin horizontal dividers, subtle row hover, and horizontal scrolling on narrow screens. Do not shrink data text to unreadable sizes.

### Map or geographic visualization
Use a dark green surface with a high-contrast map layer and restrained overlays. A real map requires a mapping library and suitable geographic data or tiles; CSS alone cannot recreate the map data.

## Responsive behavior

### Above 1100px
- Display sidebar and main canvas side by side.
- Display three KPI cards per row.
- Use a two-column analytics area.

### 761–1100px
- Narrow the sidebar.
- Reduce the KPI grid to two columns.
- Stack the main analytics columns when the available width is insufficient.

### At 760px and below
- Stack the app shell into one column.
- Convert sidebar navigation into a horizontally scrollable row, or replace it with an accessible menu button in a production app.
- Stack KPI cards.
- Reduce card padding.
- Allow tables to scroll horizontally.
- Keep controls large enough for touch input.

## Accessibility

- Maintain readable contrast for small labels and interactive elements.
- Use semantic headings, navigation landmarks, and table markup.
- Include visible `:focus-visible` states.
- Give icon-only buttons accessible names.
- Do not rely on green/red alone to communicate status.
- Respect `prefers-reduced-motion`.

## File usage

1. Place `global.css` in the app's global stylesheet location.
2. Import it from the application's root stylesheet entry point.
3. Apply the documented class names to the relevant layout and UI components.
4. Replace sample chart and map placeholders with actual visualization components.
5. Adjust tokens after comparing the implementation with the reference at the same viewport size.

### Example

```tsx
export default function DashboardPage() {
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">AeuxGlobal</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <a className="sidebar-link" href="/dashboard" aria-current="page">
            Dashboard
          </a>
          <a className="sidebar-link" href="/analytics">Analytics</a>
        </nav>
        <div className="sidebar-spacer" />
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">Environmental overview</p>
          </div>
          <button className="button button-primary" type="button">
            Add custom widget
          </button>
        </header>

        <section className="metric-grid" aria-label="Key metrics">
          <article className="card">
            <span className="card-label">Air pollution level</span>
            <p className="metric-value">
              35.05 <span className="metric-unit">µg/m³</span>
            </p>
            <span className="metric-change">↓ 2.7% this month</span>
          </article>
        </section>
      </main>
    </div>
  );
}
```

This example illustrates class usage only; it is not a complete reproduction of the screenshot. Add the other cards, charts, table, and map as separate components.
