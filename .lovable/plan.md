

# Core Calendar — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Calendar CRUD | `useCalendars.ts` | create/update/delete calendar, createGroup | None | `console.error` only |
| Calendar Events | `useCalendarEvents.ts` | create/update/delete event | None | `console.error` only |
| Meetings | `useMeetings.ts` | create/update/updateStatus/updateOutcome/delete/addNote/createFollowUp/publishToTeam | None | `console.error` only |
| Meeting Automations | `useMeetingAutomations.ts` | processClientCompletion/processNoShow/processInternal | None | `console.error` only |
| Booking (agent) | `useAgentBooking.ts` | createBookingCalendar/deleteBookingCalendar | None | None |
| Booking Router | `booking-router/index.ts` (edge fn) | AI routing | None | `console.error` only |
| Smoke Tests | — | — | — | No `meetings`, `calendar_events`, `ai_booking_calendars` checks |

## Implementation Plan

### A) Kernel Events — `src/hooks/useMeetings.ts`

1. `createMeeting` success → `MEETING.BOOKED` (entity_kind: `meeting`, payload: `title`, `category`, `mode`, `contact_id`)
2. `updateMeetingStatus` success with `cancelled` → `MEETING.CANCELLED` (payload: `reason`)
3. `updateMeetingStatus` success with `confirmed` → `MEETING.CONFIRMED`
4. `updateMeetingStatus` success with `completed` → `MEETING.COMPLETED`
5. `updateMeetingStatus` success with `no_show` → `MEETING.NO_SHOW`
6. `updateMeetingOutcome` success → `MEETING.OUTCOME_SET` (payload: `outcome`)
7. `deleteMeeting` success → `MEETING.DELETED`
8. All errors → `console.warn('[CALENDAR] ..._FAILED')`

### B) Kernel Events — `src/hooks/useCalendarEvents.ts`

1. `createEvent` success → `CALENDAR_EVENT.CREATED` (payload: `title`, `calendar_id`)
2. `updateEvent` success → `CALENDAR_EVENT.UPDATED`
3. `deleteEvent` success → `CALENDAR_EVENT.DELETED`
4. All errors → `console.warn('[CALENDAR] ..._FAILED')`

### C) Kernel Events — `src/hooks/useCalendars.ts`

1. `createCalendar` success → `CALENDAR.CREATED` (payload: `name`, `calendar_type`)
2. `updateCalendar` success → `CALENDAR.UPDATED`
3. `deleteCalendar` success → `CALENDAR.DELETED`
4. All errors → `console.warn('[CALENDAR] ..._FAILED')`

### D) Kernel Events — `src/hooks/useAgentBooking.ts`

1. `useCreateBookingCalendar.onSuccess` → `BOOKING.CALENDAR_ADDED` (payload: `calendar_name`, `bot_id`)
2. `useDeleteBookingCalendar.onSuccess` → `BOOKING.CALENDAR_REMOVED`
3. All errors → `console.warn('[CALENDAR] ..._FAILED')`

### E) Observability — `booking-router/index.ts`

Add structured `console.log`/`console.warn` with `[BOOKING-ROUTER]` prefix:
- Log incoming request params
- Log matched/fallback result
- Log AI classification failures with `[BOOKING-ROUTER] AI_CLASSIFY_FAILED`

### F) Observability — All Client Hooks

All hooks get `[CALENDAR]` prefixed `console.log` on success, `console.warn` on error.

### G) Smoke Tests

Add to `system-run-smoke-tests`:
- `meetings` table check
- `calendar_events` table check
- `calendars` table check
- `ai_booking_calendars` table check

All events use `source_module: 'core-calendar'`.

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useMeetings.ts` | Import `emitKernelEvent`; emit `MEETING.BOOKED`/`CANCELLED`/`CONFIRMED`/`COMPLETED`/`NO_SHOW`/`OUTCOME_SET`/`DELETED`; add `[CALENDAR]` logging |
| `src/hooks/useCalendarEvents.ts` | Import `emitKernelEvent`; emit `CALENDAR_EVENT.CREATED`/`UPDATED`/`DELETED`; add logging |
| `src/hooks/useCalendars.ts` | Import `emitKernelEvent`; emit `CALENDAR.CREATED`/`UPDATED`/`DELETED`; add logging |
| `src/hooks/useAgentBooking.ts` | Import `emitKernelEvent`; emit `BOOKING.CALENDAR_ADDED`/`REMOVED`; add logging |
| `supabase/functions/booking-router/index.ts` | Add `[BOOKING-ROUTER]` structured logging for requests, matches, fallbacks, and failures |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `meetings`, `calendar_events`, `calendars`, `ai_booking_calendars` checks |

