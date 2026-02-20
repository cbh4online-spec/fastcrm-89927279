

# Fix `serve()` to `Deno.serve()` in All Edge Functions

## Problem

161 edge function files use the bare `serve(async (req) => {` call instead of `Deno.serve(async (req) => {`. Some files import `serve` from `https://deno.land/std@0.168.0/http/server.ts`, others use it without any import at all. The correct Deno 2 pattern is `Deno.serve()` with no import needed.

## What Changes

Every edge function `index.ts` under `supabase/functions/` that uses `serve(async` will be updated to `Deno.serve(async`. Any corresponding `import { serve } from "https://deno.land/std@..."` line will be removed since `Deno.serve` is a global and needs no import.

## Scope

- ~161 files under `supabase/functions/*/index.ts`
- Two types of fix per file:
  1. Remove `import { serve } ...` line (if present)
  2. Replace `serve(async (req) =>` with `Deno.serve(async (req) =>`
- No logic changes, no database changes, no new files

## Technical Notes

- `Deno.serve` is the built-in HTTP server API in Deno and requires no import
- The old `serve` from `deno.land/std` is deprecated
- Some files (like `robots-txt`, `firecrawl-search`) already use `Deno.serve` correctly -- those are skipped
- Files that already have the correct pattern will not be touched

