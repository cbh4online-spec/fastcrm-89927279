

# Collapsible Sidebar with Icon-Only Mini Mode

## Overview

Add a collapse/expand toggle to the sidebar. When collapsed, the sidebar shrinks to a narrow strip (~56px) showing only icons with tooltips on hover. Persisted in localStorage.

## Current State

- Sidebar is fixed at `w-64` (256px), always expanded on desktop (`lg:translate-x-0`)
- `DashboardLayout` hard-codes `lg:pl-64` for the main content offset
- Mobile uses a slide-in overlay pattern (unchanged by this feature)
- WorkspaceSwitcher shows logo + name + role + chevron

## Design

```text
EXPANDED (w-64)              COLLAPSED (w-14)
┌────────────────────┐       ┌──────┐
│ WS Logo  Name   ▾  │       │ Logo │
│────────────────────│       │──────│
│ 🔍 Quick Actions ⌘K│       │  🔍  │
│────────────────────│       │──────│
│ FAVORITOS           │       │  ★   │
│  ★ Leads            │       │  ★   │
│────────────────────│       │──────│
│ ⌂ Dashboard     ☆  │       │  ⌂   │
│ ✦ Ask FastCRM   ☆  │       │  ✦   │
│ ── ── ── ── ── ──  │       │ ───  │
│ 👤 Leads        ☆  │       │  👤  │
│ ...                 │       │ ...  │
│                     │       │      │
│ [«] Collapse        │       │ [»]  │
└────────────────────┘       └──────┘
```

- A toggle button at the bottom of the sidebar: "Collapse" with `PanelLeftClose` icon when expanded, just `PanelLeftOpen` icon when collapsed
- All nav items show only their icon (centered) when collapsed, with a `Tooltip` on hover showing the name
- WorkspaceSwitcher shows only the logo when collapsed
- Quick Actions shows only the search icon when collapsed
- Favorites section shows only icons when collapsed
- Star pin buttons hidden when collapsed
- Separators still render as thin lines

## State Management

- New state: `collapsed: boolean`, persisted in `localStorage` key `sidebar-collapsed`
- Passed from `DashboardLayout` (or managed inside `SidebarV1` itself with a hook)
- `DashboardLayout` reads the collapsed state to set `lg:pl-64` vs `lg:pl-14`
- On mobile, sidebar always renders expanded (collapse is desktop-only)

## Implementation Plan

### 1. Create `useSidebarCollapse` hook

**New file: `src/hooks/useSidebarCollapse.ts`**

Simple localStorage-backed boolean toggle:
- `collapsed: boolean`
- `toggleCollapse(): void`
- Storage key: `sidebar-collapsed`

### 2. Update `SidebarV1.tsx`

- Import `useSidebarCollapse`, `Tooltip`/`TooltipTrigger`/`TooltipContent`, `PanelLeftClose`/`PanelLeftOpen` icons
- Read `collapsed` state from the hook
- Change aside width: `collapsed ? "w-14" : "w-64"` (with `transition-all duration-200`)
- **Header**: When collapsed, hide workspace name/role, show only the logo (centered)
- **Quick Actions**: When collapsed, show only the Search icon (centered), no text/kbd
- **Favorites section**: When collapsed, hide the "Favoritos" label and star buttons, show only icons with tooltips
- **Nav items**: When collapsed, hide `<span>` text and star buttons, center the icon, wrap in `Tooltip`
- **Separators**: Still render (just shorter)
- **Collapse toggle**: Add a button at the bottom of the sidebar — full row when expanded ("Recolher" + icon), just icon when collapsed
- On mobile (`open` prop overlay mode): always render expanded regardless of `collapsed` state

### 3. Update `DashboardLayout.tsx`

- Import `useSidebarCollapse`
- Replace hard-coded `lg:pl-64` with `collapsed ? "lg:pl-14" : "lg:pl-64"` (with `transition-all duration-200`)

### 4. Update `WorkspaceSwitcher.tsx`

- Accept an optional `collapsed?: boolean` prop
- When collapsed, render only the workspace logo (no dropdown trigger text, just the logo as the button)

## Files to Create / Edit

| File | Change |
|---|---|
| `src/hooks/useSidebarCollapse.ts` | **NEW** — localStorage-backed collapsed state hook |
| `src/components/layout/SidebarV1.tsx` | Add collapse logic, icon-only mode, tooltips, toggle button |
| `src/components/layout/DashboardLayout.tsx` | Dynamic `pl-64` / `pl-14` based on collapsed state |
| `src/components/layout/WorkspaceSwitcher.tsx` | Accept `collapsed` prop, show logo-only when collapsed |

