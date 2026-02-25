

# Plan: Keyboard Accessibility for Drag-and-Drop Reordering

## Overview

Add keyboard accessibility to the drag-and-drop reordering in the Layout Config Dialog and the Sidebar, supporting Enter/Space to grab/release items, arrow keys to move, and a live region for screen reader announcements.

## Files to Edit

### 1. `src/components/opportunities/detail/OpportunityLayoutConfigDialog.tsx` — EDIT

**DraggableItem component changes:**
- Add `tabIndex={0}`, `role="listitem"`, `aria-grabbed`, `aria-label` attributes
- Add `isGrabbed` and `onKeyDown` props
- Add focus ring styles and grabbed visual state (ring-2 ring-primary shadow-md)
- Set checkbox `tabIndex={-1}` so tab goes to the row, not the checkbox independently

**Dialog component changes:**
- Add `grabbedItem` state (string | null) to track keyboard-grabbed item
- Add `liveText` state (string) for screen reader announcements
- Add a visually hidden `<div aria-live="assertive">` live region that reads `liveText`
- Add `handleKeyDown(listId, list, setList)` function:
  - **Enter/Space**: Toggle grabbed state. Announce "Grabbed [name], position X of Y" or "Dropped [name] at position X of Y"
  - **ArrowUp/ArrowDown**: When grabbed, swap item with neighbor, update list state, announce "Moved [name] to position X of Y"
  - **Escape**: Cancel grab, announce "Reorder cancelled"
- Pass `isGrabbed` and `onKeyDown` to each `DraggableItem`
- Wrap item lists in `<div role="list" aria-label="...">`

### 2. `src/components/opportunities/detail/OpportunityDetailSidebar.tsx` — EDIT

**SidebarSection component changes:**
- Add `tabIndex`, `role="listitem"`, `aria-grabbed`, `aria-label`, `onKeyDown` props
- Add focus ring and grabbed visual styles

**OpportunityDetailSidebar component changes:**
- Add `grabbedSection` state and `liveText` state
- Add a visually hidden live region `<div aria-live="assertive">`
- Add `handleSidebarKeyDown(sectionId)` function with same Enter/Space/Arrow/Escape logic
- On arrow key move: reorder `sidebarOrder` locally and call `updatePrefs.mutate({ sidebar_order: newOrder })`
- Pass keyboard props to each SidebarSection
- Wrap sections container in `<div role="list" aria-label="Sidebar sections">`

## No New Files or Dependencies

All changes are within existing components using native keyboard events and ARIA attributes.

## i18n

No new translation keys needed — announcements use programmatic strings with item labels and positions that are already translated.

