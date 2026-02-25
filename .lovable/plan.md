

# Add Favorites Section to Sidebar

## Overview

Add a "Favoritos" section to the sidebar where users can pin/unpin their most-used navigation pages. Pinned pages appear at the top of the sidebar (between Quick Actions and the main nav list) for fast access. Favorites are persisted per-workspace in localStorage.

## How It Works

- Each nav item gets a pin/unpin action (star icon on hover)
- Pinned items appear in a collapsible "Favoritos" section above the main navigation
- Stored in `localStorage` keyed by workspace ID
- Users can remove favorites by clicking the star again (in either section)

## Technical Plan

### 1. New Hook: `src/hooks/useSidebarFavorites.ts`

A custom hook that manages favorites in localStorage per workspace:

- `favorites: string[]` — array of `href` values
- `toggleFavorite(href: string)` — add/remove from list
- `isFavorite(href: string)` — check if pinned
- Storage key: `sidebar-favorites-{workspaceId}`
- Max 8 favorites

### 2. Update Sidebar: `src/components/layout/SidebarV1.tsx`

- Import the new hook and `Star` icon from lucide-react
- Add a "Favoritos" section between Quick Actions and the main nav:
  - Small label: "Favoritos" in muted text (like Attio's style)
  - List of pinned nav items (resolved from `NAV_V1_ITEMS` by href)
  - Each with a filled star icon to unpin
  - If empty, section is hidden
  - Separator below the section
- In the main nav list, add a star icon (outline) on hover for each item to pin it
- Pinned items still appear in the main list (just also duplicated in Favoritos)

### 3. No Database Changes

Favorites are lightweight UI preferences — localStorage is sufficient. No backend tables needed.

## Files to Create / Edit

| File | Change |
|---|---|
| `src/hooks/useSidebarFavorites.ts` | **NEW** — localStorage-backed hook for managing pinned pages |
| `src/components/layout/SidebarV1.tsx` | Add Favoritos section + pin/unpin star icons on nav items |

## Visual Layout

```text
┌─────────────────────────┐
│ Workspace Name       ▾  │
│─────────────────────────│
│ 🔍 Quick Actions    ⌘K │
│─────────────────────────│
│ FAVORITOS               │
│  ★ Leads                │
│  ★ Oportunidades        │
│─────────────────────────│
│ ⌂ Dashboard         ☆  │
│ ✦ Ask FastCRM        ☆  │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│ 👤 Leads             ★  │
│ 📇 Contactos         ☆  │
│ ...                     │
└─────────────────────────┘
```

Star icons: ★ = pinned (filled, click to unpin), ☆ = not pinned (outline, appears on hover, click to pin).

