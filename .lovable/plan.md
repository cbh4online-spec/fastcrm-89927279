

# Fix: "Failed to send a request to the Edge Function"

## Root Cause

The `ask-fastcrm` edge function is **not declared** in `supabase/config.toml`. This means it defaults to `verify_jwt = true`, which with the signing-keys system silently rejects all requests — producing "Failed to send a request to the Edge Function" with zero logs.

## Fix

Add to `supabase/config.toml`:

```toml
[functions.ask-fastcrm]
verify_jwt = false
```

The function already validates auth internally via `getUser()`, so disabling the gateway JWT check is safe and required.

**1 file changed. No code or database changes needed.**

