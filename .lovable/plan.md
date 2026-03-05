

# Core Feed — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Posts CRUD | `useInternalFeed.ts` — `useInternalFeed()` | create/update/delete/pin/resolve | None | Toast only |
| Comments | `useInternalFeed.ts` — `usePostComments()` | add/delete comment, reaction | None | Toast only |
| Mentions | `useInternalFeed.ts` — `useMyMentions()` | markAsRead | None | None |
| Smoke Tests | `system-run-smoke-tests` | — | — | No `internal_posts` check |

## Implementation Plan

### A) Kernel Events + Logging — `src/hooks/useInternalFeed.ts`

Import `emitKernelEvent`. All events: `source_module: 'core-feed'`.

**`useInternalFeed()` mutations:**
1. `createPost.onSuccess` → `FEED.POST_CREATED` (entity_kind: `post`, payload: `feed_type`, `post_type`, `has_mentions`, `has_checklist`)
2. `updatePost.onSuccess` → `FEED.POST_UPDATED`
3. `deletePost.onSuccess` → `FEED.POST_DELETED`
4. `togglePin.onSuccess` → `FEED.POST_PINNED` (payload: `is_pinned`)
5. `resolvePost.onSuccess` → `FEED.POST_RESOLVED` (payload: `is_resolved`)
6. All errors → `console.warn('[FEED] ..._FAILED')`
7. All successes → `console.log('[FEED] ...')`

**`usePostComments()` mutations:**
1. `addComment.onSuccess` → `FEED.COMMENT_CREATED` (entity_kind: `comment`, payload: `post_id`, `is_reply`)
2. `deleteComment.onSuccess` → `FEED.COMMENT_DELETED`
3. All errors → `console.warn('[FEED] ..._FAILED')`

**`useMyMentions()` mutations:**
1. `markAsRead.onSuccess` → `console.log('[FEED] Mention marked as read')`

### B) Smoke Tests

Add to `system-run-smoke-tests`:
- `internal_posts` table check
- `post_comments` table check

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useInternalFeed.ts` | Import `emitKernelEvent`; emit events for post CRUD, comments, pins, resolves; add `[FEED]` logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `internal_posts` and `post_comments` checks |

