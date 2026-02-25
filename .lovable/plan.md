

# Plan: Add Slide-in Template Preview Panel

## Overview

Add a preview panel that slides in from the right side of the template list when a user hovers over or clicks a template card. The panel shows the full body content with template variables (`{{variable}}`) visually highlighted as colored badges.

## Current Behavior

- Clicking a card selects it (highlight + footer bar appears)
- "Pré-visualizar" button in footer navigates to the full Attio-style detail view
- No hover preview exists

## New Behavior

- **Hover or click** a template card: a ~340px panel slides in from the right edge of the list area, showing:
  - Template name + category badge
  - Subject line (if present) with variable highlights
  - Full body text with `{{variable}}` tokens rendered as inline colored badges
  - Section count + field list summary
  - "Usar template" quick-action button
- Panel animates in using `animate-slide-in-right` (already defined in tailwind config)
- Clicking a different card updates the panel content
- The existing "Pré-visualizar" button in the footer still navigates to the full Attio-style detail view

## Implementation

### 1. Variable highlighting utility

Create a small helper function `highlightVariables(text: string): React.ReactNode[]` that splits body/subject text on `{{...}}` patterns and returns an array of text spans and Badge elements for each variable.

### 2. New component: `TemplatePreviewPanel.tsx`

A right-side panel component receiving a `LibraryTemplate` prop:

```text
┌──────────────────────────┐
│ Template Name            │
│ [Category Badge]         │
├──────────────────────────┤
│ Assunto:                 │
│ Text with {{var}} badges │
├──────────────────────────┤
│ Corpo:                   │
│                          │
│ Full body text with      │
│ {{primeiro_nome}} shown  │
│ as highlighted badges    │
│                          │
├──────────────────────────┤
│ 4 Secções                │
│ Tt Situação              │
│ ≡ Problema               │
│ ...                      │
├──────────────────────────┤
│ [Usar template →]        │
└──────────────────────────┘
```

Props: `template: LibraryTemplate`, `onUse: () => void`

### 3. Update `TemplateLibraryDialog.tsx` — list mode layout

In the list mode (non-Attio-preview), split the main area into two parts:
- **Left (flex-1)**: The existing ScrollArea with template cards (unchanged)
- **Right (w-[340px], conditional)**: The `TemplatePreviewPanel`, shown when `selectedTemplate` is set and `showPreview` is false

The panel uses `animate-slide-in-right` for entry. When `selectedTemplate` changes, the panel content updates. When deselected, the panel slides out.

### 4. Update `TemplateLibraryCard.tsx` — add hover callback

Add an optional `onHover` prop so hovering a card can also trigger selection (with a small debounce to avoid flicker). The click behavior remains the same (select + show panel).

## Files Changed

| File | Change |
|------|--------|
| `src/components/communication/TemplatePreviewPanel.tsx` | NEW — Slide-in panel with variable highlighting |
| `src/components/communication/TemplateLibraryDialog.tsx` | Add right panel in list mode layout |
| `src/components/communication/TemplateLibraryCard.tsx` | Add optional `onHover` prop |

## Technical Notes

- Variable highlighting: regex split on `{{(\w+)}}`, render matches as `<Badge variant="secondary" className="font-mono text-xs">variable</Badge>`
- Uses existing `animate-slide-in-right` animation from tailwind config
- No new dependencies needed
- The panel is inside the dialog, so no z-index conflicts
- Body text rendered with `whitespace-pre-wrap` to preserve line breaks
- Structure labels (`**Bold**`) stripped using existing `stripStructureLabels` utility before display

