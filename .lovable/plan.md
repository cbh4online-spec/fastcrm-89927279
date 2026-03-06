

# Fix: Lead name click not navigating to detail page

## Investigation

I thoroughly reviewed the code and the routing setup looks correct:
- `SmartLeadsTable.tsx` line 375: `<Link to={`/dashboard/leads/${lead.id}`}>` — correct URL
- `App.tsx` line 444: `<Route path="/dashboard/leads/:id" element={<LeadDetail />} />` — route exists
- `LeadDetailWithSidebar.tsx`: correctly reads `useParams<{ id: string }>()` and loads lead data
- No parent click handlers on `TableRow` that could intercept navigation

## Likely cause

The `Link` inside the sticky column (`z-20 bg-card`) may be visually visible but have its click area blocked by the scroll overlay or adjacent z-index layers in `StickyTableWrapper`. This is a CSS stacking context issue with sticky positioning.

## Fix

Make the approach more robust by:

1. **`src/components/leads/SmartLeadsTable.tsx`**: Add `onClick` handler on the `TableRow` to navigate to the lead detail page (using `useNavigate`), making the entire row clickable as a reliable fallback. Add `cursor-pointer` to the row. Keep the `Link` for accessibility/SEO.

2. **Ensure proper z-index**: Add `relative z-10` to the `Link` element inside the sticky cell to ensure it sits above any overlay layers.

### Changes

**File: `src/components/leads/SmartLeadsTable.tsx`**
- Import `useNavigate` from `react-router-dom`
- Add `const navigate = useNavigate()` in the component
- On `TableRow` at line 369, add: `onClick={() => navigate(`/dashboard/leads/${lead.id}`)}` and add `cursor-pointer` class
- Add `relative z-10` to the Link element
- Prevent click propagation on checkbox and action buttons with `e.stopPropagation()`

