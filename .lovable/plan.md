

# Add Color to EntityDetailsPanel

## Problem

The sidebar "Detalhes" panel is entirely monochrome — all icons use `text-muted-foreground`, tags use plain `secondary` badges, and there is no visual distinction between field types. Comparing with the Attio reference, icons should use semantic/brand colors, and tags should have colored variants.

## Changes

### `src/components/entity/EntityDetailsPanel.tsx`

**1. Colored icons per field type** — Instead of all icons being `text-muted-foreground`, apply semantic colors:

| Icon | Color Class |
|------|------------|
| Mail | `text-blue-500` |
| Phone | `text-green-500` |
| Globe | `text-purple-500` |
| Linkedin | `text-[#0A66C2]` (LinkedIn brand) |
| Facebook | `text-[#1877F2]` (Facebook brand) |
| Instagram | `text-[#E4405F]` (Instagram brand) |
| Twitter | `text-foreground` (X brand) |
| Building2 | `text-slate-500` |
| Briefcase | `text-amber-500` |
| MapPin | `text-red-500` |
| TrendingUp | `text-emerald-500` |
| Users | `text-indigo-500` |
| DollarSign | `text-green-600` |
| Tag | `text-orange-500` |
| Calendar | `text-sky-500` |

Implementation: Add an `iconClassName` prop to `EditableFieldRow` and pass the color class for each field. The icon will use this class instead of the default `text-muted-foreground`.

**2. Colored tags** — Replace the plain `Badge variant="secondary"` in `TagList` with a deterministic color system: hash the tag string to pick from a palette of soft colors (similar to the Attio Categories badges).

Color palette for tags:
- `bg-blue-100 text-blue-700 border-blue-200`
- `bg-green-100 text-green-700 border-green-200`
- `bg-amber-100 text-amber-700 border-amber-200`
- `bg-purple-100 text-purple-700 border-purple-200`
- `bg-red-100 text-red-700 border-red-200`
- `bg-teal-100 text-teal-700 border-teal-200`
- `bg-pink-100 text-pink-700 border-pink-200`
- `bg-indigo-100 text-indigo-700 border-indigo-200`

**3. Section header icons** — Add subtle colored icons to `CollapsibleSection` titles for visual hierarchy (optional, lightweight enhancement).

### Files Modified

| File | Change |
|------|--------|
| `src/components/entity/EntityDetailsPanel.tsx` | Add `iconClassName` prop to `EditableFieldRow`, apply colored classes to all icon instances, update `TagList` with deterministic color mapping |

