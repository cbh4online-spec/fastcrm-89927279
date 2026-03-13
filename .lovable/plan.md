

# Fix: High Severity Dependency Vulnerabilities

## Findings

### 1. `xlsx` — Prototype Pollution & ReDoS
- **Frontend**: Already on `0.20.3` (via CDN tarball in package.json) — **no action needed**
- **Edge Functions**: Two files still pin `npm:xlsx@0.18.5` (vulnerable):
  - `supabase/functions/supplier-import-parse/index.ts` line 2
  - `supabase/functions/supplier-import-validate/index.ts` line 2
- **Fix**: Update both imports from `npm:xlsx@0.18.5` to `npm:xlsx@0.20.3`

### 2. `@trigger.dev/sdk` — Listed in scanner but **not in package.json**
- Only referenced as a type import in `trigger.config.ts`
- This appears to be a config stub — Trigger.dev is not actively installed or used as a runtime dependency
- **Fix**: No action needed (or optionally remove the unused `trigger.config.ts` and related type files if desired, but that's a separate cleanup task)

## Changes

| File | Change |
|------|--------|
| `supabase/functions/supplier-import-parse/index.ts` | `npm:xlsx@0.18.5` → `npm:xlsx@0.20.3` |
| `supabase/functions/supplier-import-validate/index.ts` | `npm:xlsx@0.18.5` → `npm:xlsx@0.20.3` |

Two single-line edits. No logic changes.

