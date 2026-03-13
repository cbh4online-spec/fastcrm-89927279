

# Fix: Remaining Dependency Vulnerabilities

## Analysis

The uploaded scan (dated March 4) flags two packages, but both have already been addressed or are non-issues:

| Package | Scan Says | Actual State |
|---------|-----------|-------------|
| `xlsx` | `^0.18.5` (vulnerable) | Already `0.20.3` in package.json + edge functions — **resolved in prior fix** |
| `@trigger.dev/sdk` | `^4.3.3` (high) | **Not in package.json** — only a type import in unused `trigger.config.ts` |

## Remaining Action: Remove unused Trigger.dev stub

The only actionable item is to **delete `trigger.config.ts`** entirely. This file:
- Is the sole reference to `@trigger.dev/sdk` in the project
- Only imports a type — Trigger.dev is not installed or used at runtime
- Removing it eliminates the scanner warning completely

## Changes

| Action | File |
|--------|------|
| Delete | `trigger.config.ts` |

One file deletion. No logic impact — this is dead code removal.

