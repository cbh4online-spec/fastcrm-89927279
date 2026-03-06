

# Phase 2 — Inbox Three-Panel Redesign

## Current State
- `InboxSidebar.tsx` exists with channels, categories, and contacts sections but is **not rendered** in `InboxView.tsx`
- `InboxView.tsx` has a 2-panel layout (conversation list + detail) with an optional CRM context panel
- `AIMessageComposer.tsx` already has AI suggest/shorten/commercial buttons and template panel
- No keyboard shortcuts exist (`useInboxHotkeys` not found)

## Changes

### 1. Integrate InboxSidebar into InboxView (`InboxView.tsx`)
- Add `InboxSidebar` as the leftmost panel (w-60, collapsible via `[` hotkey or button)
- Add state for `showSidebar`, `selectedCategory`, `selectedChannel`
- Pass `selectedChannel` and `selectedCategory` down to `ConversationList` for filtering
- New 4-panel layout: Sidebar (240px) | ConversationList (320px) | Detail (flex) | CRM Panel (320px, toggle)
- Move the compose button into the sidebar header ("Nova Mensagem")

### 2. Wire sidebar filters to ConversationList (`ConversationList.tsx`)
- Accept new props: `categoryFilter` (from sidebar) and `channelFilter` (from sidebar)
- Remove the inline channel filter pills (now handled by sidebar)
- Keep the search bar and status tabs in the list header
- Map sidebar categories to existing tab logic (new→requires_response, assigned, pending, favourites, etc.)

### 3. Conversation List quick actions (`ConversationList.tsx`)
- On hover, show action icons: Resolve (check), Follow-up (clock), Archive (archive)
- Wire resolve to existing `useUpdateConversation` (status → closed)
- Wire follow-up to set `conversation_status_simplified` → FOLLOW_UP
- Wire archive to status → archived

### 4. Keyboard Shortcuts (`src/hooks/useInboxHotkeys.ts` — new)
- `C` → open compose, `J`/`K` → navigate conversations, `E` → resolve selected
- `R` → focus reply, `F` → mark follow-up, `#` → archive
- `P` → toggle CRM panel, `[` → toggle sidebar, `Cmd+Enter` → send
- `?` → show shortcuts modal
- Uses `useEffect` with keydown listener, respects active input/textarea focus

### 5. Keyboard Shortcuts Modal (`src/components/inbox/KeyboardShortcutsModal.tsx` — new)
- Simple dialog listing all shortcuts in a grid
- Triggered by `?` key or a button in the header

### 6. Compose box enhancements (`AIMessageComposer.tsx`)
- Add "Enviar e Resolver" as primary action (Cmd+Enter) — sends message then sets conversation status to closed
- Add "Traduzir" button alongside existing Encurtar/Mais comercial
- Add "/" template command detection — when user types "/" show template picker inline

## File Summary

| File | Action |
|------|--------|
| `src/components/inbox/InboxView.tsx` | Major rewrite: add sidebar panel, state management, 4-column layout |
| `src/components/inbox/InboxSidebar.tsx` | Minor: add "Nova Mensagem" button at top, accept onCompose callback |
| `src/components/inbox/ConversationList.tsx` | Add categoryFilter/channelFilter props, hover quick actions, remove inline channel pills |
| `src/components/inbox/AIMessageComposer.tsx` | Add "Send and Resolve" action, translate button, "/" template trigger |
| `src/hooks/useInboxHotkeys.ts` | New: keyboard shortcut hook |
| `src/components/inbox/KeyboardShortcutsModal.tsx` | New: shortcuts help modal |

