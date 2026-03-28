

# Inbox UX Improvements

## Current State
The inbox already has a solid foundation: 4-column layout, sidebar with channels/categories, conversation list with avatars and quick actions, message bubbles with timestamps, AI composer, and email HTML rendering. However, several UX details are missing or weak.

## Issues Identified
1. **Conversation list shows only relative time** ("há 2 dias") — no absolute date/hour visible
2. **No email subject in conversation list** — hard to distinguish email conversations
3. **No clear direction indicator** — only "Tu:" text prefix for outbound, nothing visual for inbound
4. **Message bubbles lack prominent timestamps** — time is tiny and easy to miss
5. **No time gap separators** between messages sent hours apart (only date separators exist)
6. **No read/delivery status in list** — user can't see if their last message was read without opening

---

## Plan

### 1. Conversation List — Better Date/Time Display
**File: `ConversationList.tsx`**

- Show **absolute time** (HH:mm) for today's messages, **date + time** (dd/MM HH:mm) for older ones
- Replace `formatDistanceToNow` with a smart formatter: "14:32" today, "Ontem 14:32", "25/03 14:32"
- Keep relative time as a tooltip on hover

### 2. Conversation List — Email Subject Preview
**File: `ConversationList.tsx`**

- For email channel conversations, show the email subject as a secondary line above the message preview
- Style: smaller, bold text with a Mail icon, truncated

### 3. Conversation List — Direction + Status Indicators
**File: `ConversationList.tsx`**

- Add a small arrow icon (↗ outbound / ↙ inbound) before the preview text instead of just "Tu:"
- Add a subtle delivery status icon (single check = sent, double check = delivered, colored = read) for the last outbound message

### 4. Message Bubbles — Enhanced Timestamps
**File: `MessageBubble.tsx`**

- Make timestamp more visible: increase from `text-[10px]` to `text-xs`
- Show full date + time format: "25 Mar, 14:32"
- For outbound, move delivery status inline with timestamp

### 5. Time Gap Separators Between Messages
**File: `ConversationDetail.tsx`**

- When there's a gap of 2+ hours between consecutive messages (same day), insert a subtle time separator: "— 3h depois —"
- This complements the existing date separators

### 6. Pinned Conversations
**File: `ConversationList.tsx`**

- Add a pin icon on hover (quick action) that pins a conversation to the top
- Pinned state stored in localStorage (no DB change needed)
- Pinned conversations appear in a separate section above the main list with a subtle divider

---

## Files Modified

| File | Changes |
|---|---|
| `src/components/inbox/ConversationList.tsx` | Smart timestamps, email subject, direction arrows, delivery status, pin support |
| `src/components/inbox/MessageBubble.tsx` | Larger timestamps, improved layout |
| `src/components/inbox/ConversationDetail.tsx` | Time gap separators between messages |

## Technical Notes
- Smart time formatting uses `isToday`/`isYesterday` from date-fns (already imported)
- Pin state uses localStorage to avoid DB migration
- All existing functionality preserved — changes are additive

