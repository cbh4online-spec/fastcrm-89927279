

# Phase 4 — Templates + Realtime + Polish

## Current State

- **Realtime**: Already implemented — `useConversations.ts` subscribes to `conversations` table changes; `ConversationList.tsx` subscribes to `messages` INSERT events with toast notifications for inbound messages. Both emit kernel events.
- **Templates**: `TemplatesListPage.tsx` (948 lines) is fully featured with filters, KPIs, performance tab, and a "Sequências" tab that navigates to `/dashboard/sequences`. No inline sequence editor exists.
- **Sequences**: A separate module exists at `/dashboard/sequences` with `SequencesListPage.tsx`.
- **Sidebar nav**: `nav.v2.ts` has an "Inbox" core item at line 99 — no unread badge currently.
- **No density toggle** exists in inbox or anywhere.
- **Dark theme**: Uses Tailwind dark classes throughout; specific color tokens not verified.

## What's Already Done (skip)

- Realtime subscriptions for conversations and messages — already wired
- Toast for new inbound messages — already in `ConversationList.tsx` (line 124)
- Kernel event emission — already wired

## What Remains

### 4A. Unread Badge on Sidebar Nav
- Create a `useUnreadInboxCount` hook that queries conversations with `unread_count > 0` and `status = 'open'`
- Subscribe to realtime changes on `conversations` table for live updates
- In `Sidebar.tsx`, render a badge next to the "Inbox" nav item showing the count
- Add a `badge` field to `NavV2CoreItem` type to support dynamic badges

### 4B. Improve Inbound Toast with Clean Preview
- In `ConversationList.tsx`, apply `cleanEmailPreview()` to the toast description (currently shows raw `newMsg.content`)
- Include sender name in toast when available (query conversation's contact/lead name)

### 4C. List Density Toggle
- Add a density toggle button (Normal / Compact) in `ConversationList.tsx` header
- Normal: current padding (~72px rows), Compact: reduced padding (~52px rows)
- Store preference in localStorage

### 4D. Template "Use Now" Button
- In `TemplatesListPage.tsx` template cards, add a "Usar agora" button that navigates to `/dashboard/inbox` with a query param `?template={templateId}`
- In `InboxView.tsx`, detect the `template` param and open compose with the template pre-filled

### 4E. Design Polish
- Review inbox panels for dark theme consistency: ensure `bg-card`, `border-border`, `bg-background` tokens are used consistently
- Verify sidebar, conversation list, detail, and CRM panel colors

## File Summary

| File | Action |
|------|--------|
| `src/hooks/useUnreadInboxCount.ts` | New: realtime unread count hook |
| `src/config/nav.v2.ts` | Add optional `badge` to NavV2CoreItem |
| `src/components/layout/Sidebar.tsx` | Render badge for Inbox item |
| `src/components/inbox/ConversationList.tsx` | Clean toast preview, add density toggle |
| `src/components/inbox/InboxView.tsx` | Handle `?template=` param |
| `src/components/communication/TemplatesListPage.tsx` | Add "Usar agora" action to cards |

No database migrations needed — all required tables and realtime publications are already in place.

