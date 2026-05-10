# sharehtml Design System

Design system extracted from [The Unreasonable Effectiveness of HTML](https://thariqs.github.io/html-effectiveness/).

## Table of Contents

- [Color Palette](#color-palette)
- [Typography](#typography)
- [Spacing & Layout](#spacing--layout)
- [Components](#components)
  - [Hero Section](#hero-section)
  - [Topbar Navigation](#topbar-navigation)
  - [Cards](#cards)
  - [Buttons](#buttons)
  - [Code Blocks](#code-blocks)
  - [Tabs](#tabs)
  - [Pagination](#pagination)
  - [Modals](#modals)
  - [Section Headers](#section-headers)
  - [Eyebrow Labels](#eyebrow-labels)
  - [Badges](#badges)
- [Animation & Transitions](#animation--transitions)
- [Responsive Breakpoints](#responsive-breakpoints)

---

## Color Palette

### Core Colors

| Name | CSS Variable | Value | Usage |
|------|--------------|-------|-------|
| Ivory | `--ivory` | `#FAF9F5` | Main background/canvas |
| Paper | `--paper` | `#FFFFFF` | Card backgrounds, elevated surfaces |
| Slate | `--slate` | `#141413` | Primary text, headings |
| Clay | `--clay` | `#D97757` | Primary accent, links, CTAs |
| Clay Dark | `--clay-d` | `#B85C3E` | Hover state for clay |
| Oat | `--oat` | `#E3DACC` | Secondary accent, backgrounds |
| Olive | `--olive` | `#788C5D` | Success states, tertiary accent |
| Rust | `--rust` | `#B04A3F` | Error states, destructive actions |

### Neutral Scale (Grays)

| Name | CSS Variable | Value | Usage |
|------|--------------|-------|-------|
| Gray 100 | `--g100` | `#F0EEE6` | Subtle backgrounds, code blocks |
| Gray 200 | `--g200` | `#E6E3DA` | Borders, dividers |
| Gray 300 | `--g300` | `#D1CFC5` | Card borders, hairlines |
| Gray 500 | `--g500` | `#87867F` | Muted text, secondary labels |
| Gray 700 | `--g700` | `#3D3D3A` | Body text, descriptions |

### Semantic Mappings (Legacy Compatibility)

```css
--color-primary: var(--clay);
--color-primary-active: #c26648;
--color-accent-teal: var(--olive);
--color-error: var(--rust);
--color-canvas: var(--ivory);
--color-surface-soft: var(--g100);
--color-surface-card: var(--paper);
--color-ink: var(--slate);
--color-body: var(--g700);
--color-muted: var(--g500);
--color-hairline: var(--g200);
```

---

## Typography

### Font Families

```css
--font-serif: ui-serif, Georgia, "Times New Roman", Times, serif;
--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--font-mono: ui-monospace, "SF Mono", Menlo, Monaco, "Cascadia Code", Consolas, monospace;
```

### Type Scale

| Element | Font Family | Size | Weight | Line Height | Letter Spacing |
|---------|-------------|------|--------|-------------|----------------|
| h1 (Hero) | Serif | clamp(38px, 5.4vw, 62px) | 500 | 1.06 | -0.018em |
| h1 (Page) | Serif | 36-38px | 500 | 1.15 | -0.018em |
| h2 (Section) | Serif | 27-28px | 500 | 1.25 | -0.012em |
| h3 (Subsection) | Serif | 19-22px | 500 | 1.3 | -0.008em |
| Body | Sans | 15-16px | 400 | 1.55 | normal |
| Small/Meta | Sans/Mono | 11-13px | 400/500 | 1.4-1.6 | 0.08em (uppercase) |
| Code | Mono | 12.5-14px | 400 | 1.6 | normal |

### Text Colors

- **Primary text**: `var(--slate)` - Headings, important labels
- **Body text**: `var(--g700)` - Paragraphs, descriptions
- **Muted text**: `var(--g500)` - Secondary labels, timestamps
- **Links**: `var(--clay)` - All inline links
- **Code**: `var(--slate)` on `var(--g100)` background

---

## Spacing & Layout

### Container Widths

| Context | Max Width | Padding |
|---------|-----------|---------|
| Main content | 1120px | 0 32px 140px (bottom) |
| Dashboard | 1120px | 48px 32px 140px |
| Docs | 1120px | 64px 24px 120px |

### Grid Gaps

- Card grids: 20px
- Section spacing: 72px margin-top
- Component internal: 12-24px

### Border Radius

- Cards: 14px
- Buttons: 8px (primary/secondary), 999px (pills)
- Code blocks: 10px
- Inputs: 6-8px
- Badges: 4px

### Border Widths

- Cards/Buttons: 1.5px
- Hairlines: 1px
- Emphasis borders: 2-3px

---

## Components

### Hero Section

**Purpose**: Landing page introduction with clear value proposition.

**Structure**:
```
.hero
  ├─ .eyebrow (label with decorative line)
  ├─ h1 (title with em accent)
  ├─ .tldr (intro text)
  └─ .hero-actions (CTA buttons)
```

**Styles**:
```css
.hero {
  padding: 80px 0 56px;
  border-bottom: 1.5px solid var(--g300);
  margin-bottom: 12px;
}

.hero .eyebrow {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--g500);
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero .eyebrow::before {
  content: "";
  width: 24px;
  height: 1.5px;
  background: var(--clay);
}

.hero h1 {
  font-family: var(--font-serif);
  font-weight: 500;
  font-size: clamp(38px, 5.4vw, 62px);
  line-height: 1.06;
  letter-spacing: -0.018em;
  margin: 0 0 8px;
  max-width: 17ch;
  color: var(--slate);
}

.hero h1 em {
  font-style: italic;
  color: var(--clay);
}

.hero .tldr {
  font-size: 16.5px;
  color: var(--g700);
  margin: 22px 0 0;
  max-width: 620px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
}
```

**Usage** (home.tsx):
```tsx
<div class="hero">
  <div class="eyebrow">AI Agent Publishing Platform</div>
  <h1>Deploy files <em>instantly</em> with sharehtml</h1>
  <div class="tldr">
    <b>TL;DR</b> — Three ways to publish: CLI file path, stdin pipe, or curl API.
  </div>
  <div class="hero-actions">
    <a href="/docs" class="btn-primary">Read the Docs</a>
    <a href="https://github.com/duyet/sharehtml" class="btn-secondary">View on GitHub</a>
  </div>
</div>
```

---

### Topbar Navigation

**Purpose**: Persistent site navigation across all pages.

**Styles**:
```css
.topbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: var(--ivory);
  border-bottom: 1.5px solid var(--g300);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.topbar-home {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 500;
  color: var(--slate);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.topbar-link {
  font-size: 14px;
  color: var(--g700);
  text-decoration: none;
}

.topbar-link:hover {
  color: var(--clay);
}
```

---

### Cards

**Purpose**: Display content in elevated, interactive containers.

**Variants**:
- `.recent-card` - For recent document links
- `.doc-card` - For document list items
- `.doc-grid-card` - For dashboard grid items
- `.method-card` - For setup instruction cards

**Base Styles**:
```css
.card {
  background: var(--paper);
  border: 1.5px solid var(--g300);
  border-radius: 14px;
  padding: 24px;
  text-decoration: none;
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(20, 20, 19, 0.10);
  border-color: var(--slate);
}
```

**Card Internal Structure**:
```css
.doc-card-title {
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 500;
  color: var(--slate);
  letter-spacing: -0.008em;
}

.doc-card-filename {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--g500);
}

.doc-card-meta {
  font-size: 13px;
  color: var(--g700);
}
```

**Grid Layout**:
```css
.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(316px, 1fr));
  gap: 20px;
}
```

---

### Buttons

**Purpose**: Primary and secondary call-to-action elements.

**Primary Button**:
```css
.btn-primary {
  display: inline-block;
  background: var(--clay);
  color: var(--paper);
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  font-size: 16px;
  transition: background 120ms ease;
}

.btn-primary:hover {
  background: var(--clay-d);
}
```

**Secondary Button**:
```css
.btn-secondary {
  display: inline-block;
  background: var(--paper);
  color: var(--slate);
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  font-size: 16px;
  border: 1.5px solid var(--g300);
  transition: border-color 120ms ease;
}

.btn-secondary:hover {
  border-color: var(--slate);
}
```

**Small/Button Group Buttons**:
```css
.doc-grid-btn {
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--g200);
  background: var(--paper);
  color: var(--g700);
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease;
}

.doc-grid-btn:hover {
  border-color: var(--g300);
  background: var(--g100);
}
```

---

### Code Blocks

**Purpose**: Display code snippets, commands, and technical content.

**Styles**:
```css
pre {
  background: var(--g100);
  border-radius: 10px;
  padding: 16px 18px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--slate);
  overflow-x: auto;
  margin: 14px 0;
  white-space: pre;
}

code {
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--g100);
  padding: 3px 6px;
  border-radius: 4px;
  color: var(--slate);
}

/* Inline code comment style */
.comment, .docs-comment {
  color: var(--g500);
}
```

---

### Tabs

**Purpose**: Switch between alternative content views (e.g., CLI vs curl commands).

**Styles**:
```css
.docs-tabs {
  border: 1.5px solid var(--g300);
  border-radius: 10px;
  background: var(--paper);
  margin: 16px 0 8px;
  overflow: hidden;
}

.docs-tabbar {
  display: flex;
  border-bottom: 1px solid var(--g200);
  background: var(--g100);
}

.docs-tabbar button {
  appearance: none;
  border: none;
  background: none;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--g500);
  padding: 10px 16px;
  cursor: pointer;
  border-right: 1px solid var(--g200);
  transition: background 150ms ease, color 150ms ease;
}

.docs-tabbar button:hover {
  background: var(--paper);
  color: var(--g700);
}

.docs-tabbar button.on {
  background: var(--ivory);
  color: var(--slate);
  border-bottom: 2px solid var(--clay);
  margin-bottom: -1px;
}

.docs-tabs pre {
  display: none;
  margin: 0;
  padding: 16px 18px;
}

.docs-tabs pre.on {
  display: block;
}
```

---

### Pagination

**Purpose**: Navigate between pages of content.

**Styles**:
```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
}

.pagination-link {
  padding: 7px 14px;
  background: var(--paper);
  border: 1.5px solid var(--g300);
  border-radius: 999px;
  text-decoration: none;
  color: var(--g700);
  font-size: 12.5px;
  transition: border-color 120ms, color 120ms, background 120ms;
}

.pagination-link:hover:not(.disabled) {
  border-color: var(--slate);
  color: var(--slate);
}

.pagination-link.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.pagination-info {
  color: var(--g500);
  font-size: 12.5px;
}
```

---

### Modals

**Purpose**: Overlay dialogs for confirmations and important actions.

**Styles**:
```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 20, 19, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: var(--paper);
  border-radius: 12px;
  padding: 32px;
  max-width: 480px;
  width: 100%;
  margin: 16px;
  box-shadow: 0 12px 40px rgba(20, 20, 19, 0.12);
  border: 1px solid var(--g200);
}

.modal-title {
  font-family: var(--font-serif);
  font-size: 24px;
  color: var(--slate);
  margin-bottom: 12px;
}

.modal-description {
  font-size: 15px;
  color: var(--g700);
  margin-bottom: 24px;
  line-height: 1.55;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-submit {
  background: var(--clay);
  color: var(--paper);
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: background 150ms ease;
}

.modal-cancel {
  background: transparent;
  color: var(--g500);
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--g200);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 150ms ease, color 150ms ease;
}
```

---

### Section Headers

**Purpose**: Divide content into thematic sections.

**Styles**:
```css
.section {
  margin-top: 72px;
  scroll-margin-top: 28px;
}

.section-label {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--g500);
  margin-bottom: 16px;
}
```

**With Index Numbers** (from reference):
```css
.sec-head {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 10px;
}

.sec-head .idx {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--clay);
  font-weight: 600;
  width: 34px;
  flex-shrink: 0;
}

.sec-head h2 {
  font-family: var(--font-serif);
  font-weight: 500;
  font-size: 27px;
  margin: 0;
  letter-spacing: -0.012em;
}

.sec-intro {
  font-size: 14.5px;
  color: var(--g700);
  max-width: 700px;
  margin: 0 0 24px 50px;
}
```

---

### Eyebrow Labels

**Purpose**: Small categorical labels above headings.

**Styles**:
```css
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11-12px;
  letter-spacing: 0.08-0.12em;
  text-transform: uppercase;
  color: var(--g500);
  margin-bottom: 10-18px;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* With decorative line (hero variant) */
.hero .eyebrow::before {
  content: "";
  width: 24px;
  height: 1.5px;
  background: var(--clay);
}
```

---

### Badges

**Purpose**: Small status or category indicators.

**Styles**:
```css
.share-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
  line-height: 1.4;
}

.badge-link {
  background: rgba(120, 140, 93, 0.12);
  color: var(--olive);
  border: 1px solid rgba(120, 140, 93, 0.3);
}

.badge-email {
  background: rgba(217, 119, 87, 0.12);
  color: var(--clay);
  border: 1px solid rgba(217, 119, 87, 0.3);
}

.badge-private {
  background: rgba(135, 134, 127, 0.08);
  color: var(--g500);
  border: 1px solid var(--g200);
}
```

**Count Badge** (for section headers):
```css
.count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--g500);
  background: var(--g100);
  padding: 2px 8px;
  border-radius: 999px;
}
```

---

## Animation & Transitions

### Transition Durations

- **Fast**: 120ms - Buttons, links, border colors
- **Medium**: 150ms - Cards, transforms, shadows
- **Slow**: 200ms+ - Complex multi-property transitions

### Easing

- Default: `ease` (browser default bezier)
- Use for all standard transitions

### Hover Effects

**Cards**:
```css
transform: translateY(-3px);
box-shadow: 0 10px 30px rgba(20, 20, 19, 0.10);
```

**Buttons**:
```css
/* Primary */
background: var(--clay-d); /* darker clay */

/* Secondary */
border-color: var(--slate);
```

**Links**:
```css
text-decoration-color: var(--clay);
/* or */
border-bottom-color: var(--clay);
```

---

## Responsive Breakpoints

### Breakpoint Values

| Breakpoint | Max Width | Adjustments |
|------------|-----------|-------------|
| Mobile | 768px | Single column, reduced padding |
| Tablet | 1024px | 2-column grids |
| Desktop | 1025px+ | Full layouts, 3-column grids |

### Mobile Adjustments

```css
@media (max-width: 768px) {
  .content {
    padding: 32px 16px 64px;
  }

  .hero h1 {
    font-size: 40px;
  }

  .recent-grid,
  .doc-grid {
    grid-template-columns: 1fr;
  }

  .topbar {
    padding: 0 16px;
  }
}
```

```css
@media (max-width: 1024px) {
  .doc-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## File Organization

```
apps/worker/src/client/
├── theme.css       # Color palette, font stacks, CSS variables
├── shared.css      # Base styles, topbar, buttons, common components
├── home.css        # Home page specific styles
├── dashboard.css   # Dashboard specific styles
├── docs.css        # Documentation page styles
└── components.css  # Reusable component patterns
```

---

## Usage Guidelines

### When to Use Serif vs Sans

- **Serif**: Headings (h1-h3), page titles, card titles
- **Sans**: Body text, UI labels, navigation
- **Mono**: Code, file paths, technical labels, badges

### Color Usage

- **Clay**: Primary actions, links, emphasis
- **Slate**: Headings, primary text
- **G700**: Body text, descriptions
- **G500**: Muted text, metadata, timestamps
- **G300**: Card borders, dividers
- **G100**: Subtle backgrounds, code blocks
- **Ivory**: Main page background
- **Paper**: Card backgrounds, elevated surfaces

### Spacing

- **Section spacing**: 72px margin-top between major sections
- **Card spacing**: 20px gap in grids
- **Text spacing**: 12-24px for paragraph margins
- **Component padding**: 16-32px depending on context

---

## References

- Original source: [The Unreasonable Effectiveness of HTML](https://thariqs.github.io/html-effectiveness/)
- Implementation files:
  - `apps/worker/src/client/theme.css`
  - `apps/worker/src/client/shared.css`
  - `apps/worker/src/client/home.css`
  - `apps/worker/src/client/dashboard.css`
  - `apps/worker/src/client/docs.css`
