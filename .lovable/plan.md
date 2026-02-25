

# Ask FastCRM — Premium UX Upgrade

## Current State Analysis

| Component | Status | Gap |
|---|---|---|
| `AskFastCRMDialog` | Uses ⌘J shortcut, Dialog-based overlay | Needs ⌘K (conflicts with GlobalSearch), autocomplete, keyboard nav, premium polish |
| `AskFastCRMResultPanel` | Has headline/subtext, items, actions, did_you_mean, confirmation | Needs "View all" truncation, stage/company badges on items, max 3 actions + "More" |
| `GlobalSearch` | Uses ⌘K, CommandDialog-based | Must yield ⌘K to Ask; GlobalSearch moves to ⌘/ or stays as secondary |
| `TopBar` | Has Ask button with ⌘J badge | Must update shortcut badge to ⌘K |
| `useRecentAskQueries` | Fetches 5 recent queries | Increase to 8 |
| Autocomplete | Not implemented | Need inline suggestions while typing |
| Empty results | Not handled | Need "Nothing found" + threshold chips |

### Shortcut Conflict Resolution

`GlobalSearch` currently owns ⌘K. The plan reassigns ⌘K to Ask FastCRM (the primary command interface) and moves GlobalSearch to ⌘/ (standard search shortcut in many apps). This is a clean separation: ⌘K = intelligence/revenue commands, ⌘/ = entity search.

---

## Implementation Plan

### 1. Shortcut Reassignment

**`src/components/layout/GlobalSearch.tsx`**
- Change keyboard shortcut from ⌘K to ⌘/ (line 71)
- Update the `<kbd>` badge from `⌘K` to `⌘/` (line 178-179)

**`src/components/ask-fastcrm/AskFastCRMDialog.tsx`**
- Change shortcut from ⌘J to ⌘K (line 38)
- Update the `<kbd>` badge from `⌘J` to `⌘K` (line 109)

**`src/components/layout/TopBar.tsx`**
- Update the Ask button kbd from `⌘J` to `⌘K` (line 72)

### 2. Autocomplete Suggestions While Typing

**`src/components/ask-fastcrm/AskFastCRMDialog.tsx`**

Add a lightweight autocomplete system using a static map of keyword-to-suggestion:

```typescript
const AUTOCOMPLETE_MAP: Record<string, string> = {
  "risk": "Which deals are at risk?",
  "at risk": "Which deals are at risk?",
  "close": "What will close this month?",
  "closing": "What will close this month?",
  "stuck": "Which deals are stuck in stage?",
  "no act": "Deals with no activity in 14 days",
  "inactive": "Deals with no activity in 14 days",
  "next step": "Deals with no next step",
  "high": "Show highest value deals",
  "value": "Show highest value deals",
  "pipeline": "How is my pipeline?",
  "forecast": "What's blocking my forecast?",
};
```

- Use `useDebounce(input, 150)` to debounce the input
- Match against the map keys; show up to 3 suggestions below the input as clickable rows
- Clicking a suggestion fills the input and submits immediately
- Render suggestions only when `input.length >= 2` and no result is showing
- Suggestions appear with a subtle fade-in animation

### 3. Keyboard Navigation (Items + Suggestions)

**`src/components/ask-fastcrm/AskFastCRMDialog.tsx`**

Add `selectedIndex` state and `onKeyDown` handler on the dialog content:

- ↑/↓ arrows navigate through autocomplete suggestions or result items
- Enter on a suggestion submits it; Enter on a result item opens the deal link
- Esc closes the dialog (already works via Dialog)
- Add `aria-activedescendant`, `role="listbox"` on the suggestions/items container
- Add `role="option"`, `aria-selected` on each item

### 4. Result Panel Premium Polish

**`src/components/ask-fastcrm/AskFastCRMResultPanel.tsx`**

4A. **Item rows — add stage badge + company**
- Each item already has `health_label`, `title`, `subtitle`, `value`
- Add a `stage` field to `AskResultItem` interface (optional string)
- Render stage as a small neutral badge next to the health badge
- Subtitle already shows company info from the edge function

4B. **Truncate items to 10 + "View all" button**
- Show only the first 10 items from `result.items`
- If more than 10, show a "View all (N)" button that navigates to the deals list with filters applied

4C. **Max 3 visible actions + "More" dropdown**
- Show first 3 actions as buttons
- If more than 3, wrap remaining in a DropdownMenu with "More..." trigger

4D. **Empty results state**
- When `result.items.length === 0` and no `did_you_mean` and no `metric`:
  ```
  "Nothing found for that query."
  Try: [No activity 7d] [No activity 14d] [No activity 30d]
  ```

4E. **Confirmation modal enhancement**
- When `pendingAction` is set and items > 10, show a preview of the first 5 item names in the confirmation overlay

### 5. Loading State Polish

**`src/components/ask-fastcrm/AskFastCRMDialog.tsx`**

Already uses skeleton loading. Refine:
- Add staggered fade-in on each skeleton line using framer-motion
- Remove spinner from header area when loading (keep only skeleton in content)

### 6. Recent Queries — Increase to 8

**`src/hooks/useRecentAskQueries.ts`**
- Change `.limit(5)` to `.limit(12)` (fetch more to account for deduplication)
- After dedup, slice to 8 results

### 7. ARIA & Accessibility

**`src/components/ask-fastcrm/AskFastCRMDialog.tsx`**
- Add `aria-label="Ask FastCRM"` to the input
- Add `role="listbox"` to the suggestions/items container
- Add `role="option"` + `aria-selected` to each suggestion/item
- Focus trap already handled by Dialog component

### 8. AskFastCRMInline — Sync Changes

**`src/components/ask-fastcrm/AskFastCRMInline.tsx`**
- Update SUGGESTED_CHIPS to match the 6-chip set: `["Deals at risk", "No activity in 14 days", "No next step", "Closing this month", "Stuck in stage", "High value deals"]`
- Add loading skeleton instead of spinner

### 9. Update AskResultItem Interface

**`src/hooks/useAskFastCRM.ts`**
- Add `stage?: string` to `AskResultItem`

---

## Files to Edit

| File | Changes |
|---|---|
| `src/components/layout/GlobalSearch.tsx` | Change ⌘K → ⌘/, update kbd badge |
| `src/components/layout/TopBar.tsx` | Update Ask button kbd badge ⌘J → ⌘K |
| `src/components/ask-fastcrm/AskFastCRMDialog.tsx` | ⌘K shortcut, autocomplete, keyboard nav, refined chips (6), ARIA, skeleton polish |
| `src/components/ask-fastcrm/AskFastCRMResultPanel.tsx` | Stage badge, 10-item truncation + View all, max 3 actions + More dropdown, empty state, confirmation preview |
| `src/components/ask-fastcrm/AskFastCRMInline.tsx` | Sync chips, skeleton loading |
| `src/hooks/useAskFastCRM.ts` | Add `stage` to `AskResultItem` |
| `src/hooks/useRecentAskQueries.ts` | Increase limit to 8 |

## No database migration needed

All data structures already exist. No edge function changes required — this is purely a frontend UX upgrade.

