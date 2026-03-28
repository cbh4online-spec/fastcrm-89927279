

# Fix: Flipbook cover page appearing blank

## Problem
The screenshot shows the flipbook cover page (page 1/16) is completely dark with no visible title, subtitle, or author text. The toolbar at the bottom works, but the page content area is empty.

## Root cause analysis

The issue is in **FlipbookReader.tsx** — the page container uses `relative` positioning with the `motion.div` child set to `absolute inset-0`. However, the parent container doesn't explicitly set a sized context that guarantees the absolute child fills it properly across all render cycles. Additionally, the `AnimatePresence mode="wait"` combined with `absolute inset-0` can cause the page to collapse to zero height during animation transitions, since the absolute element doesn't contribute to parent height.

Key problems:
1. **`absolute inset-0` on motion.div** — page content has no intrinsic height contribution; if the parent's height isn't resolved (e.g. `h-[85vh]` on an element inside a flex container that hasn't laid out yet), content is invisible
2. **Cover page text colors** — white text on slate-900 gradient works in theory, but if the container has zero computed height, nothing is visible
3. **`overflow-hidden`** on the page container clips everything if sizing is off

## Fix plan

### 1. FlipbookReader.tsx — Fix page container layout
- Change the page viewport from `relative` + `absolute inset-0` children to a proper flex layout
- Use `relative w-full h-full` on the motion.div instead of `absolute inset-0`
- Set explicit `min-h` on the page container as fallback
- Add `flex flex-col` to ensure the page fills its container

### 2. FlipbookReader.tsx — Fix animation container
- Replace `absolute inset-0` on `motion.div` with `w-full h-full` 
- Wrap in a container that uses `relative overflow-hidden` with explicit dimensions
- This ensures the page always has computed dimensions even during animation transitions

### 3. FlipbookPage.tsx — Add fallback visibility
- Add `min-h-[400px]` to cover page as safety net
- Ensure the cover gradient is always visible regardless of parent sizing

### Files changed
- `src/components/ebooks/FlipbookReader.tsx` — fix layout/animation container
- `src/components/ebooks/FlipbookPage.tsx` — add min-height safety

