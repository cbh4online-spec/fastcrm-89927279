

# Community-FastClub — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Forum Topic CRUD | `useForum.ts` | None | Toast only |
| Forum Post/Reply | `useForum.ts` | None | Toast only |
| Community Settings | `useCommunitySettings.ts` | None | Toast only |
| Community Events | `useCommunityEvents.ts` | None | Toast only |
| Community Members/Invites | `useCommunityMembers.ts` | None | `console.error` only |
| Moderation (shared) | `useModeration.ts` | None | Toast only |
| Community Banner (edge fn) | `generate-community-banner` | None | `console.error` |
| Community Invite (edge fn) | `send-community-invite` | None | `console.error`/`console.log` |
| Smoke Tests | `system-run-smoke-tests` | — | No community checks |

Zero kernel events. No standardized logging across 6 hook files and 2 edge functions.

## Implementation Plan

### A) Kernel Events (source: `community-fastclub`)

**`useForum.ts`:**
1. `useCreateForumTopic.onSuccess` → emit `COMMUNITY.TOPIC_CREATED` (entity_kind: `forum_topic`, payload: `category_id`, `moderation_status`, `comments_enabled`)
2. `useCreateForumPost.onSuccess` → emit `COMMUNITY.POST_CREATED` (entity_kind: `forum_post`, payload: `topic_id`)

**`useCommunityEvents.ts`:**
3. `useCreateCommunityEvent.onSuccess` → emit `COMMUNITY.EVENT_CREATED` (entity_kind: `community_event`, payload: `event_type`, `title`)

**`useCommunityMembers.ts`:**
4. `useInviteCommunityMember.onSuccess` → emit `COMMUNITY.MEMBER_INVITED` (entity_kind: `community_member`, payload: `invite_count`)

**`useCommunitySettings.ts`:**
5. `useUpsertCommunitySettings.onSuccess` → emit `COMMUNITY.SETTINGS_UPDATED` (entity_kind: `community_settings`)

### B) Logging (prefix: `[COMMUNITY-FASTCLUB]`)

**`useForum.ts`:**
- Topic created success/error, post created success/error

**`useCommunityEvents.ts`:**
- Event created success/error

**`useCommunityMembers.ts`:**
- Invite success/error (already has `console.error`, align prefix)

**`useCommunitySettings.ts`:**
- Settings upsert success/error

**`generate-community-banner/index.ts`:**
- Align to `[COMMUNITY-FASTCLUB]` prefix

**`send-community-invite/index.ts`:**
- Align to `[COMMUNITY-FASTCLUB]` prefix

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `forum_topics` (module: `community-fastclub`)
- `forum_posts` (module: `community-fastclub`)
- `community_settings` (module: `community-fastclub`)
- `community_members` (module: `community-fastclub`)
- `community_events` (module: `community-fastclub`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useForum.ts` | Import `emitKernelEvent`; emit `COMMUNITY.TOPIC_CREATED` + `COMMUNITY.POST_CREATED`; add `[COMMUNITY-FASTCLUB]` logging |
| `src/hooks/useCommunityEvents.ts` | Import `emitKernelEvent`; emit `COMMUNITY.EVENT_CREATED`; add `[COMMUNITY-FASTCLUB]` logging |
| `src/hooks/useCommunityMembers.ts` | Import `emitKernelEvent`; emit `COMMUNITY.MEMBER_INVITED`; add `[COMMUNITY-FASTCLUB]` logging |
| `src/hooks/useCommunitySettings.ts` | Import `emitKernelEvent`; emit `COMMUNITY.SETTINGS_UPDATED`; add `[COMMUNITY-FASTCLUB]` logging |
| `supabase/functions/generate-community-banner/index.ts` | Align logging to `[COMMUNITY-FASTCLUB]` prefix |
| `supabase/functions/send-community-invite/index.ts` | Align logging to `[COMMUNITY-FASTCLUB]` prefix |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add 5 community table checks |

