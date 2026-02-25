

# Drag-and-Drop Animations with Framer Motion for Kanban Board

## Current State

The Kanban board uses native HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDragEnd`, `onDragOver`, `onDrop`) with minimal visual feedback:
- Cards get `opacity-50 rotate-2 shadow-lg` when dragging
- Columns get `bg-primary/5 border-primary/50 ring-2` when hovered over during drag
- No animation on card mount, reorder, or drop
- Cards are rendered in plain `div` wrappers inside `OpportunityKanbanColumn`

## What We'll Build

Smooth framer-motion animations for:
1. **Card mount/layout animation** — cards animate in with stagger and animate position changes via `AnimatePresence` + `layoutId`
2. **Drag ghost enhancement** — scale + shadow + rotation animation on drag start
3. **Drop landing animation** — spring animation when card lands in new column
4. **Column hover pulse** — subtle scale pulse on column when valid drop target
5. **Card exit animation** — fade-out when card leaves a column during drag
6. **Empty state transition** — smooth transition when column goes from empty to populated

## Approach

We keep native HTML5 drag-and-drop for the actual data transfer (it works reliably cross-browser), but wrap cards in `motion.div` with `layout` prop for automatic position animations. The key technique: `layout` prop on `motion.div` makes framer-motion automatically animate position/size changes when the DOM order changes (e.g., card moves between columns via React re-render after drop).

## File Changes

| File | Action | Description |
|---|---|---|
| `src/components/opportunities/OpportunityKanbanColumn.tsx` | **EDIT** | Wrap cards in `motion.div` with `layout`, `initial`, `animate`, `exit` props; add `AnimatePresence`; animate column drop zone |
| `src/components/opportunities/OpportunityCard.tsx` | **EDIT** | Add `motion.div` wrapper with drag state animations (scale, shadow, rotation transitions) |
| `src/components/opportunities/OpportunitiesModule.tsx` | **EDIT** | Add `LayoutGroup` wrapper around kanban columns for cross-column layout animations |

## Technical Details

### OpportunityCard.tsx
- Wrap the `Card` in a `motion.div` with `layout` prop and `layoutId={opportunity.id}`
- On `isDragging`: animate to `scale: 1.05, rotate: 2, boxShadow: "..."` with spring transition
- On drop: spring back to `scale: 1, rotate: 0`

### OpportunityKanbanColumn.tsx
- Wrap card list in `AnimatePresence mode="popLayout"`
- Each card wrapper gets `motion.div` with:
  - `layout` for smooth position transitions
  - `initial={{ opacity: 0, y: 20 }}` for mount animation
  - `animate={{ opacity: 1, y: 0 }}` 
  - `exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}`
  - `transition={{ type: "spring", stiffness: 500, damping: 35 }}`
- Column drop zone gets `motion.div` with animated border/background on `isDragOver`
- Empty state gets `AnimatePresence` for smooth appear/disappear

### OpportunitiesModule.tsx
- Wrap the kanban columns `div` with `<LayoutGroup>` from framer-motion so layout animations coordinate across columns

## Implementation Order

1. Edit `OpportunitiesModule.tsx` — add `LayoutGroup` wrapper
2. Edit `OpportunityKanbanColumn.tsx` — add `AnimatePresence`, `motion.div` wrappers with layout animations
3. Edit `OpportunityCard.tsx` — add motion-based drag state animations

