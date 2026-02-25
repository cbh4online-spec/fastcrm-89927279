

# Analysis: Attio-style Deal Detail Page

## Current State

After thorough review, **all the features described in this request are already implemented** in the codebase:

| Feature | Status | Location |
|---|---|---|
| Header with close (X) + nav | Implemented | `OpportunityDetailPage.tsx` lines 182-196, `OpportunityRecordNav.tsx` |
| Expanded tabs with counts/badges | Implemented | `OpportunityDetailPage.tsx` lines 215-301, colored dots + badge counts |
| Redesigned highlights cards | Implemented | `OpportunityHighlightsCards.tsx` with configurable layout |
| Collapsible sidebar sections | Implemented | `OpportunityDetailSidebar.tsx` with `SidebarSection` + `Collapsible` |
| "Show all values" toggle | Implemented | `OpportunityDetailSidebar.tsx` line 189-191 |
| Priority Level field | Implemented | `OpportunityDetailSidebar.tsx` line 179 |
| Lists section | Implemented | `OpportunityDetailSidebar.tsx` lines 256-275 |
| Compact activity timeline | Implemented | `OpportunityActivityTimeline.tsx` |
| Header actions (email, copy, share, favorite, more) | Implemented | `OpportunityHeaderActions.tsx` |
| "+ Add tab" dropdown | Implemented | `OpportunityDetailPage.tsx` lines 272-301 |
| Drag-and-drop sidebar reordering | Implemented | `OpportunityDetailSidebar.tsx` with DnD handlers |
| Layout config dialog | Implemented | `OpportunityLayoutConfigDialog.tsx` |

## One Bug Found: Owner Name Not Displayed

The `ownerName` prop on `OpportunityHighlightsCards` is never passed from `OpportunityDetailPage`, so the "Deal Owner" card always shows "—". The opportunity has an `owner_id` field but the owner's profile name is not being resolved.

## Proposed Fix

| File | Action | Description |
|---|---|---|
| `src/components/opportunities/OpportunityDetailPage.tsx` | **EDIT** | Resolve `owner_id` to a display name using workspace members or profiles, then pass `ownerName` prop to `OpportunityHighlightsCards` |

### Implementation
1. Query workspace members or profiles to match `opportunity.owner_id` to a name
2. Pass the resolved name as `ownerName` to `OpportunityHighlightsCards`

This is a small fix (3-5 lines of code change). All other Attio-style features are already fully functional.

