

# Fix: Missing `/dashboard/knowledge` Route

## Problem
The sidebar nav (both v1 and v2) links to `/dashboard/knowledge`, but no route exists for that path. The `KnowledgeBase` page component is imported in `App.tsx` but never mounted on any route.

## Fix
Add a route in `App.tsx`:

```tsx
<Route path="/dashboard/knowledge" element={<KnowledgeBase />} />
```

This single line addition connects the existing nav item to the already-imported page component.

