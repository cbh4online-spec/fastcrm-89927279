

# Ask FastCRM — Embedded Inline (Attio-style)

## What the User Wants

Replace the popup dialog (`AskFastCRMDialog`) with an embedded, full-page conversational interface — like Attio's "Ask Attio" where the AI chat lives as a first-class page within the app layout, not a modal overlay.

## Current State

| Component | Type |
|---|---|
| `AskFastCRMDialog` | Popup dialog (⌘K) — **to be replaced** |
| `AskFastCRMInline` | Embedded in Intelligence → Assist tab — **already inline** |
| TopBar button | Opens popup dialog — **needs redirect** |

## Plan

### 1. New Page: `/dashboard/ask`

**New file: `src/pages/AskPage.tsx`**

A dedicated full-page Ask experience wrapped in `DashboardLayout`. Layout inspired by Attio:

```text
┌──────────────────────────────────────────────┐
│  Sidebar  │  Ask FastCRM                     │
│           │                                  │
│  Home     │  ┌────────────────────────────┐  │
│  Objects  │  │  Empty state / results     │  │
│  Inbox    │  │  (reuses AskFastCRMInline  │  │
│  Ask  ←── │  │   with full-height layout) │  │
│  ...      │  │                            │  │
│           │  │                            │  │
│           │  └────────────────────────────┘  │
│           │  ┌────────────────────────────┐  │
│           │  │  Input + Send              │  │
│           │  └────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

- Full viewport height (`h-[calc(100vh-5rem)]`)
- Chat-style layout: results scroll area + fixed input at bottom
- Reuses `AskFastCRMInline` internally but with a wider, more spacious layout
- Supports `?q=` query param for pre-filled queries (from proactive nudges)

### 2. Add "Ask" to Sidebar Navigation

**Edit: `src/config/nav.v2.ts`**

Add a new nav item between Inbox and Automations:

```typescript
{ name: "Ask", href: "/dashboard/ask", icon: Sparkles }
```

This gives Ask first-class presence in the sidebar, like Attio.

### 3. Change TopBar Button + ⌘K to Navigate

**Edit: `src/components/layout/TopBar.tsx`**

- Remove `AskFastCRMDialog` import and rendering
- Remove `askOpen` state
- Change the Sparkles button `onClick` to `navigate("/dashboard/ask")`
- Change ⌘K handler to `navigate("/dashboard/ask")` instead of toggling dialog

### 4. Update Dashboard Nudge to Navigate

**Edit: `src/pages/Dashboard.tsx`**

- Remove `AskFastCRMDialog` from Dashboard
- Remove `askDialogOpen` / `askPrefilledQuery` state
- Change `AskProactiveNudge` `onAskQuery` to navigate to `/dashboard/ask?q={query}` instead of opening dialog

### 5. Add Route

**Edit: `src/App.tsx`**

Add route:
```typescript
<Route path="/dashboard/ask" element={<AskPage />} />
```

### 6. Update AskFastCRMInline for Full-Page Mode

**Edit: `src/components/ask-fastcrm/AskFastCRMInline.tsx`**

- Accept optional `initialQuery?: string` prop
- When provided, auto-submit on mount (same pattern as the old dialog)
- Adjust height to `h-[calc(100vh-5rem)]` for full-page usage
- Add autocomplete suggestions (port from the dialog's `AUTOCOMPLETE_MAP`)
- Add recent queries section (port from dialog)

## Files to Create / Edit

| File | Change |
|---|---|
| `src/pages/AskPage.tsx` | **NEW** — Full-page Ask wrapper with query param support |
| `src/config/nav.v2.ts` | Add "Ask" nav item with Sparkles icon |
| `src/components/layout/TopBar.tsx` | Navigate to `/dashboard/ask` instead of opening dialog; remove dialog |
| `src/pages/Dashboard.tsx` | Navigate to `/dashboard/ask?q=...` instead of opening dialog; remove dialog |
| `src/components/ask-fastcrm/AskFastCRMInline.tsx` | Add `initialQuery` prop, autocomplete, recent queries |
| `src/App.tsx` | Add `/dashboard/ask` route |

## What Gets Removed

- `AskFastCRMDialog` stops being rendered from TopBar and Dashboard (file stays for backward compat but is no longer the primary interface)
- No more modal overlay for Ask

## Result

Ask FastCRM becomes a first-class, embedded page in the app — personal, conversational, always accessible from the sidebar, exactly like Attio's approach.

