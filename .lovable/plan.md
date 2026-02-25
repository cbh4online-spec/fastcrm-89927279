

# Custom Objects in Sidebar — Attio-Style Dynamic Navigation

## Context

Attio treats all data as "objects" — standard ones (People, Companies, Deals) and custom ones (Partnership, Invoice, Project, etc.) — and all appear as first-class items in the sidebar under a "Records" section. Your project already has all the backend infrastructure for this:

- `custom_objects` table (name, slug, icon, color, is_active)
- `core_object_fields` for attribute definitions
- `object_records` for the actual data
- `object_relationships` for associations
- `useCustomObjects` hook that queries active custom objects
- Routes at `/objects`, `/objects/:type`, `/objects/:type/:id`

What's missing is the sidebar integration — custom objects don't appear in the navigation.

## What Changes

The sidebar will dynamically load active custom objects from the database and render them as navigation items below the static CRM section, with a subtle "Records" label and separator. Each custom object gets its own icon (from the DB) and links to `/objects/{slug}`.

```text
┌─────────────────────────┐
│ ...                     │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│ 👤 Leads                │
│ 📇 Contactos            │
│ 🏢 Empresas             │
│ 🎯 Oportunidades        │
│ ☑ Tarefas               │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│ RECORDS                 │  ← New dynamic section
│ 🤝 Parcerias            │  ← From custom_objects
│ 📄 Faturas              │
│ 📦 Projetos             │
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│ 📦 Produtos             │
│ ...                     │
└─────────────────────────┘
```

When no custom objects exist, the "Records" section is hidden entirely.

## Technical Plan

### 1. Update `SidebarV1.tsx`

- Import `useCustomObjects` hook and `getIconByName` utility
- After the static `NAV_V1_ITEMS` navigation loop, insert a dynamic "Records" section:
  - A `Separator` followed by a small "Records" label (hidden when collapsed)
  - For each active custom object: render a nav link to `/objects/{slug}` with the object's icon (resolved via `getIconByName`) and name
  - Support collapsed mode (icon-only + tooltip) and expanded mode (icon + name + star for favorites)
  - Items are pinable to favorites using the same `toggleFavorite` mechanism (using the `/objects/{slug}` href)

### 2. Update `nav.v1.ts` — Add type to `NavV1Item`

- Add an optional `dynamic?: boolean` flag so dynamic items can be differentiated if needed
- No changes to the static items array itself

### 3. Update `useSidebarFavorites.ts`

- No changes needed — it already works with any `href` string, so `/objects/partnerships` will work automatically

## Files to Create / Edit

| File | Change |
|---|---|
| `src/components/layout/SidebarV1.tsx` | Add dynamic "Records" section after static nav, using `useCustomObjects` |
| `src/config/nav.v1.ts` | Minor: add optional `dynamic` flag to `NavV1Item` interface |

## Edge Cases

- **No custom objects**: Section hidden entirely (no label, no separator)
- **Loading state**: Custom objects query loading — section not shown until loaded
- **Icon resolution**: Uses `getIconByName(obj.icon)` which falls back to a default icon
- **Collapsed mode**: Shows only icons with tooltips, same as static items
- **Favorites**: Custom object links can be pinned to favorites just like any other page

