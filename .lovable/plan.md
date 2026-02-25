

# Plan: Adopt Attio-style Template Detail View

## What's Changing

The current template preview is a simple pre-formatted text block. The screenshot shows a much richer detail view with section cards (title + description + format badge) and a right sidebar summary. We'll redesign the preview mode inside `TemplateLibraryDialog` to match this pattern.

## Current vs Target

**Current preview**: Plain `<pre>` block showing the raw body text, with subject above it.

**Target (from screenshot)**:
- **Left area**: Vertical list of section cards, each with bold title, description paragraph, and a "Format: Tt Text" or "Format: ≡ List" badge at the bottom
- **Right sidebar (~280px)**: Category badge, template name, description, and a "Sections" list with type icons
- **Breadcrumb**: "Templates › ChAMP" at the top instead of a back button
- **"Use this template →" button**: Bottom-right, styled with accent color

## Implementation

### 1. Add `sectionDescription` to `LibraryTemplateField` — `templateLibraryData.ts`

Each field currently only has `name` and `type`. Add an optional `description: string` field so each section card can show explanatory text matching the screenshot pattern.

Update all 18 templates to include descriptions for their fields. Example for BANT:
```typescript
{ name: 'Budget', type: 'Text', description: 'Summarize any discussion around budget, pricing concerns, or willingness to invest in a solution.' },
{ name: 'Authority', type: 'List', description: 'Identify who the key decision-makers are, their role in the purchasing process, and any internal influencers mentioned.' },
```

### 2. Redesign preview mode — `TemplateLibraryDialog.tsx`

Replace the current simple preview (lines 118-135) with a two-column layout:

**Left column (flex-1)**: Section cards stacked vertically — each card is a bordered container with:
- Bold section title
- Description paragraph in muted text
- Bottom row with format badge: icon (Tt for Text, ≡ for List, # for Number, 📅 for Date) + type label

**Right column (~280px)**: Sticky sidebar card with:
- Category badge (colored)
- Template name (h3)
- Description
- "Sections" label with list of section names + type icons

**Breadcrumb**: Replace "← Voltar à lista" button with "Templates › {name}" breadcrumb where "Templates" is clickable.

### 3. Update footer for preview mode

When in preview, show "Use this template →" button (primary, with arrow icon) aligned to the bottom-right of the right sidebar or in the footer bar.

## Files Changed

| File | Change |
|------|--------|
| `src/components/communication/templateLibraryData.ts` | Add `description` field to `LibraryTemplateField` interface; add descriptions to all template fields |
| `src/components/communication/TemplateLibraryDialog.tsx` | Redesign preview mode with section cards + right sidebar layout |

## Visual Layout (Preview Mode)

```text
┌─────────────────────────────────────────────────────────┐
│ Templates › ChAMP                                    ✕  │
├────────────────────────────────┬────────────────────────┤
│                                │  Sales                 │
│  ┌──────────────────────────┐  │  ChAMP                 │
│  │ Challenges               │  │  Identify challenges,  │
│  │                          │  │  authority, budget...   │
│  │ Summarize the key pain   │  │                        │
│  │ points and challenges... │  │  Sections              │
│  │                          │  │  Tt Challenges         │
│  │ Format  Tt Text          │  │  ≡  Authority          │
│  └──────────────────────────┘  │  Tt Money              │
│                                │  ≡  Prioritization     │
│  ┌──────────────────────────┐  │                        │
│  │ Authority                │  │                        │
│  │                          │  │                        │
│  │ Identify who the key     │  │                        │
│  │ decision-makers are...   │  │                        │
│  │                          │  │ ┌────────────────────┐ │
│  │ Format  ≡ List           │  │ │ Use this template →│ │
│  └──────────────────────────┘  │ └────────────────────┘ │
│  ...                           │                        │
└────────────────────────────────┴────────────────────────┘
```

## Technical Notes

- No new dependencies needed
- The `description` field is optional so existing code won't break
- Type icons: `Type` (lucide) for Text, `List` for List, `Hash` for Number, `Calendar` for Date, `ChevronDown` for Select
- Right sidebar uses `sticky top-0` for scroll behavior

