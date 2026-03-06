# Phase 4 — Templates + Realtime + Polish: Complete ✅

## What was implemented

### 4A. Unread Badge on Sidebar Nav ✅
- Created `useUnreadInboxCount` hook with realtime subscription
- Added `badgeKey` field to `NavV2CoreItem` type
- Sidebar renders a primary-colored badge next to "Inbox" when unread count > 0

### 4B. Improve Inbound Toast with Clean Preview ✅
- Applied `cleanEmailPreview()` to toast descriptions instead of raw `newMsg.content`

### 4C. List Density Toggle ✅
- Added Normal/Compact toggle button in ConversationList header
- Compact mode reduces row padding from `py-2.5` to `py-1.5`
- Preference stored in localStorage (`inbox-density`)

### 4D. Template "Usar agora" Button ✅
- Added "Usar agora" button on each template card navigating to `/dashboard/inbox?template={id}`
- InboxView detects `?template=` param and shows guidance toast

### 4E. Design Polish
- Inbox already uses semantic tokens (`bg-card`, `border-border`, `bg-background`, `bg-accent`)
- No changes needed — existing implementation is consistent
