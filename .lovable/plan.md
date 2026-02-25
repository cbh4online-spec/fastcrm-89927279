

# Redesign Sidebar V1 — Attio-Style

## Attio's Sidebar Design Language

From the screenshot, Attio's sidebar has these distinctive characteristics:

- **White/light background** — no dark gradients, clean and bright
- **Workspace switcher at top** — workspace name + dropdown chevron, minimal chrome
- **Quick Actions bar** — a row with "Quick Actions", ⌘K badge, and search icon
- **Flat navigation list** — no group headers dividing sections, just a clean vertical list of items with small monochrome icons
- **Subtle active state** — light gray background fill, no colored highlights
- **Monochrome icons** — small, consistent size, muted gray when inactive, darker when active
- **Collapsible groups** — "Automations" expands to show sub-items (Sequences, Workflows) with indentation
- **"Favorites" section** — a labeled section near the bottom for pinned items
- **No plan badge, no role indicator** — clean, focused purely on navigation

## Changes to `SidebarV1.tsx`

Complete visual overhaul:

1. **Background**: Replace `bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950` with `bg-white dark:bg-card` (light background)
2. **Border**: Replace `border-white/5` with `border-border` (standard border)
3. **Header**: Simplified — workspace name + dropdown icon, no logo block
4. **Remove Plan Badge section** entirely
5. **Remove Role Indicator section** at the bottom
6. **Navigation items**: 
   - Remove group labels (`Geral`, `CRM`, `Loja`, etc.)
   - Flatten into a single list
   - Active state: `bg-muted text-foreground font-medium` instead of `bg-primary/20 text-primary`
   - Inactive: `text-muted-foreground hover:bg-muted/50 hover:text-foreground`
   - Icons: `text-muted-foreground` when inactive, `text-foreground` when active
   - Slightly tighter vertical spacing (`py-1.5` instead of `py-2`)
7. **Quick Actions row**: Add a clickable row at the top of nav with "Quick Actions" label, ⌘K badge, and search icon that navigates to `/dashboard/ask`
8. **Text color**: All text uses standard foreground colors (dark on light), not white

## Changes to `nav.v1.ts`

- Add a `section` field to support optional visual separators (thin line) between logical groups, without labels
- Or simpler: just add separator markers between groups

## Changes to `WorkspaceSwitcher.tsx`

- Update styling for light-background context: remove `bg-sidebar-accent` and dark-theme specific colors
- Use standard `hover:bg-muted` styling

## Files to Edit

| File | Change |
|---|---|
| `src/components/layout/SidebarV1.tsx` | Complete visual redesign — light bg, flat nav, no groups, Quick Actions row, remove plan badge and role indicator |
| `src/config/nav.v1.ts` | Add separator markers between groups for subtle dividers |

## Visual Comparison

```text
BEFORE (Current)                    AFTER (Attio-style)
┌─────────────────────┐            ┌─────────────────────┐
│ ██ FastCRM      [X] │            │ Workspace Name   ▾  │
│─────────────────────│            │─────────────────────│
│ [Workspace ▾]       │            │ ⌘ Quick Actions  ⌘K │
│─────────────────────│            │  🔍  /              │
│ ★ Pro Plan          │            │─────────────────────│
│─────────────────────│            │ ⌂ Home              │
│ GERAL               │            │ ✦ Ask FastCRM       │
│  ⌂ Dashboard        │            │─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│  ✦ Ask FastCRM      │            │ 👤 Leads            │
│ CRM                 │            │ 📇 Contactos        │
│  👤 Leads           │            │ 🏢 Empresas         │
│  📇 Contactos       │            │ 🎯 Oportunidades    │
│  🏢 Empresas        │            │ ☑ Tarefas           │
│  🎯 Oportunidades   │            │─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│  ☑ Tarefas          │            │ 📦 Produtos         │
│ LOJA                │            │ 🛒 Encomendas       │
│  📦 Produtos        │            │ 📁 Categorias       │
│  🛒 Encomendas      │            │─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│  📁 Categorias      │            │ 📣 Marketing        │
│ ...                 │            │ 🔍 SEO              │
│─────────────────────│            │─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│ O SEU CARGO         │            │ ⚡ Automações       │
│ admin               │            │ 🤖 Assistentes IA   │
└─────────────────────┘            │ 📝 Form Studio      │
                                   │─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
                                   │ ⚙ Definições        │
                                   └─────────────────────┘
```

Key differences: light background, no group headers (just subtle separators), no plan badge, no role card, Quick Actions bar at top with ⌘K shortcut.

