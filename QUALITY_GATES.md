
## Quality Gates

Before any merge, the following commands **MUST** pass without errors:

```bash
# Lint
npx eslint src/ --ext .ts,.tsx

# Tests
npx vitest run

# Build
npm run build
```

### Test Coverage Summary

| Suite | File | Tests |
|-------|------|-------|
| Route Manifest integrity | `src/test/navigation.test.ts` | 10 |
| Navigation cross-references | `src/test/navigation-expanded.test.ts` | 9 |
| Menu permissions | `src/test/hooks/useMenuPermissions.test.ts` | 3 |
| Module guard | `src/test/guards/ModuleGuard.test.tsx` | 3 |
| Edge Function classification | `src/test/security/edgeFunctionClassification.test.ts` | 4 |
| **Total** | | **35** |

### Security Hardening

See `supabase/functions/_shared/security.ts` for shared helpers:
- `requireAuth()` — JWT validation via getClaims
- `requireWorkspaceMembership()` — workspace isolation
- `verifyWebhookSignature()` — HMAC-SHA256 webhook verification
- `checkReplay()` — anti-replay protection
- `isRateLimited()` — basic rate limiting
- `validatePayload()` — Zod schema validation
- `securityLog()` — structured security event logging

### Edge Function Classification

See `src/test/security/edgeFunctionClassification.test.ts` for the full classification table of all 27 explicitly configured functions.
