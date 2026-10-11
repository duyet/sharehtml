# sharehtml Design System — Paper

White, simple, minimal. Structure comes from 1px hairlines, not shadows or color.
Source of truth: `apps/worker/src/client/theme.css`.

## Tokens

Primitive tokens live in `:root` as `--paper-*`. Every other variable is an alias of them,
so dark mode only overrides the primitives.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper-bg` | `#ffffff` | `#0a0a0a` | page, cards |
| `--paper-surface` | `#fafafa` | `#111111` | subtle fills, hover rows, code blocks |
| `--paper-border` | `#ededed` | `#262626` | hairlines |
| `--paper-border-strong` | `#e5e5e5` | `#333333` | inputs, hover borders |
| `--paper-ink` | `#171717` | `#ededed` | headings, primary text |
| `--paper-body` | `#404040` | `#d4d4d4` | body copy |
| `--paper-muted` | `#6b6b6b` | `#a1a1a1` | meta, labels (≥4.5:1 on bg) |
| `--paper-accent` | `#2563eb` | `#3b82f6` | links, primary buttons, focus |
| `--paper-accent-hover` | `#1d4ed8` | `#60a5fa` | hover / active |
| `--paper-success` | `#16a34a` | `#22c55e` | success states |
| `--paper-error` | `#dc2626` | `#f87171` | errors, destructive |

Component CSS should use the semantic aliases (`--color-ink`, `--color-border`,
`--color-accent`, …). Legacy short names (`--g300`, `--ivory`, `--clay`) remain as
aliases because TSX inline styles consume them; don't add new uses.

Shape: `--radius-control: 8px`, `--radius-card: 12px`, `--shadow-subtle: 0 1px 2px rgba(0,0,0,.04)`
(the only shadow allowed).

## Type

- Sans: Geist; mono: Geist Mono (Google Fonts via `<PaperFonts />` in `frontend/jsx.tsx`), fallback `system-ui`.
- No serif display face.
- Headings: weight 600, `letter-spacing: -0.02em`.
- KPIs and numeric meta: `font-variant-numeric: tabular-nums`.

## Patterns

- **Topbar** — white, bottom hairline, logo text `sharehtml` at 600, nav links muted, hover/active ink.
- **KPI row** — one bordered box, cells split by vertical hairlines.
- **Doc lists** — rows separated by hairlines; a mono `.kind-badge` (`html` / `md` / `code`)
  before the title; meta right-aligned and muted.
- **Inverted toolbars** (selection toolbar, mobile compose bar) — ink background, bg-colored text.

## Dark mode

`@media (prefers-color-scheme: dark)` overrides the `--paper-*` primitives only.
`color-scheme` is deliberately not set, and the viewer iframe has an explicit white
background, so shared documents always render as authored.
