

# Plan: Add Rename & Duplicate to View Context Menus (like Attio)

## Context

The screenshot shows Attio's deals view with a context menu containing 4 actions: **Add to favorites**, **Rename**, **Duplicate**, and **Delete**. Our current `ViewItem` in `DealsSidebar.tsx` only has 2: Favorito and Eliminar. The `DealViewSelectorDropdown.tsx` only has Delete.

The `useUpdateSavedView` hook already exists for renaming. We need to add a duplicate mutation and wire up both Rename and Duplicate into the context menus.

## Implementation Steps

### 1. Add `useDuplicateSavedView` hook — EDIT `src/hooks/useSavedViews.ts`

Add a new mutation that reads the view by ID, then inserts a copy with `name + " (copy)"` and resets `is_default`/`is_favorite`.

### 2. Update `ViewItem` context menu — EDIT `src/components/opportunities/DealsSidebar.tsx`

Add "Rename" and "Duplicate" menu items between "Favorito" and "Eliminar":
- **Add to favorites** (existing, with star icon)
- **Rename** — opens an inline edit or prompt to rename (using `useUpdateSavedView`)
- **Duplicate** — calls `useDuplicateSavedView`
- **Delete** — existing destructive action

Add a rename dialog/inline state to `ViewItem` for editing the name.

Pass new callbacks (`onRename`, `onDuplicate`) into `ViewItem`.

### 3. Update `DealViewSelectorDropdown` context menu — EDIT `src/components/opportunities/DealViewSelectorDropdown.tsx`

Add the same 3 actions (Favorite, Rename, Duplicate) above Delete in each view's dropdown. Currently it only shows Delete.

### 4. Add i18n keys — EDIT locale files (en, es, fr, pt)

Add keys for `sidebarRenameView`, `sidebarDuplicateView`, `sidebarAddToFavorites`, `sidebarRemoveFavorite` to `crm.json` locale files.

## Technical Notes

- `useUpdateSavedView` already supports partial updates including `name` — rename just calls it with `{ name: newName }`
- Duplicate creates a new record server-side — no need for client-side ID generation
- The rename UX will use a small Dialog with a single input field (matching the existing `CreateViewDialog` pattern)
- All 4 context menu items will have icons: Star, Edit (Pencil), Copy, Trash2

