

# Fix: Email Sync "CPU Time exceeded" (WORKER_LIMIT)

## Problem

The `email-fetch` edge function consistently hits Deno edge runtime's CPU time limit. Logs show repeated `CPU Time exceeded` errors. The function does too much work in a single invocation:

1. Raw TLS IMAP connection with complex regex parsing
2. Sequential database queries per email (lead lookup → conversation lookup → dedup check → insert = 4+ queries per message)
3. Processing up to 20 emails in one call

## Solution

Optimize the function to stay within CPU limits through three changes:

### 1. Reduce default fetch limit from 20 to 5
Less emails per sync = less CPU per invocation. The UI can call sync multiple times.

### 2. Batch database operations
- Fetch all existing email_message_ids in one query upfront (dedup check)
- Fetch all existing leads by email in one query upfront
- Fetch all existing conversations by thread in one query upfront
- Then loop through messages using in-memory lookups instead of per-message DB calls

### 3. Simplify IMAP fetch command
- Remove `BODY.PEEK[TEXT]` from the IMAP FETCH — body text parsing is the heaviest part
- Fetch only `(UID FLAGS INTERNALDATE ENVELOPE)` for the listing
- Use subject as content preview instead of body text
- This dramatically reduces data transferred and parsed

### 4. Reduce read buffer timeout
- Lower timeout from 15s to 10s to fail faster on slow connections

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/email-fetch/index.ts` | Reduce limit to 5, batch DB queries, remove BODY.PEEK from FETCH, simplify parsing |

## Result
Each sync processes max 5 emails with ~3 DB queries total (instead of 4 per email = 80 queries for 20 emails). IMAP data transfer reduced by ~80% by skipping body fetch.

