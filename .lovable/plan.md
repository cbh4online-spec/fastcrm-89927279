

# Plan: Drag-and-Drop Reordering for Saved Views

## Overview

Add drag-and-drop reordering to the Views section in the DealsSidebar. Users will be able to grab a view item and drag it to reorder within the list. The new position is persisted to the database via the existing `position` column on `crm_saved_views`.

## Current State

- `SavedView` already has a `position: number` field
- The query in `useSavedViews` currently orders by `name` — needs to change to `position`
- No drag-and-drop library is installed, but we can implement lightweight HTML5 drag-and-drop without adding a dependency

## Implementation Steps

### 1. Update query ordering — `src/hooks/useSavedViews.ts`

Change `.order("name")` to `.order("position").order("name")` so views respect their saved position.

### 2. Add `useReorderSavedViews` mutation — `src/hooks/useSavedViews.ts`

New mutation that accepts an array of `{ id, position }` pairs and batch-updates them. Uses a simple loop of individual updates (Supabase doesn't support batch upsert on partial fields elegantly).

```typescript
export function useReorderSavedViews() {
  // mutationFn: receives { entity_type, items: { id, position }[] }
  // Updates each view's position in sequence
  // Invalidates saved-views query on success
}
```

### 3. Add drag-and-drop to Views list — `src/components/opportunities/DealsSidebar.tsx`

- Add local `orderedViews` state derived from `filteredViews`
- Add `draggedIndex` / `dragOverIndex` state tracking
- On each `ViewItem`, add `draggable`, `onDragStart`, `onDragOver`, `onDragEnd`, `onDrop` handlers
- Show a visual drop indicator (blue line) between items during drag
- Add a subtle drag handle (grip dots icon) on hover, left of the view dot/icon
- On drop, recompute positions and call `useReorderSavedViews`

### 4. Update `ViewItem` component — `src/components/opportunities/DealsSidebar.tsx`

- Accept new props: `isDragging`, `isDragOver`, `dragHandleProps`
- Add `GripVertical` icon (from lucide) as drag handle, visible on hover
- Apply opacity/border styling when dragging or being dragged over

## Visual Behavior

- Drag handle (⠿) appears on hover, left side of item
- Dragged item becomes semi-transparent (opacity-50)
- Drop target shows a 2px blue line above it
- On release, list reorders smoothly and positions persist

## Technical Notes

- Uses native HTML5 Drag and Drop API — no new dependencies needed
- Position values are set as 0, 1, 2, ... based on final order
- The `GripVertical` icon is already available in lucide-react
- Drag is only enabled in the Views section (not Favorites or Lists — those derive from the same data)

