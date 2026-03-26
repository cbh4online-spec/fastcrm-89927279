

# Fix: WhatsApp Connection Error

## Problem
`WhatsAppConfigPanel.tsx` calls `whatsapp-auth-url` with `{ workspace_id }` but the edge function expects `{ workspaceId, userId }`. The mismatched key + missing userId triggers a 400 response ("Missing workspaceId or userId"), which surfaces as a generic "non-2xx status code" error.

The other caller (`WhatsAppConnectionCard.tsx`) sends the correct payload.

## Fix
**File**: `src/components/settings/WhatsAppConfigPanel.tsx`

Change the `supabase.functions.invoke` call to:
- Send `workspaceId` (camelCase) instead of `workspace_id`
- Include the current user's `userId` from `supabase.auth.getUser()`

One-line fix in the invoke body, plus fetch the authenticated user before the call.

