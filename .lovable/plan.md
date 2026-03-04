

## Plan

Update the production domain in `src/utils/getPublicDomain.ts` from `https://fastcrm.lovable.app` to `https://fastcrm.metodopare.ai`.

**File: `src/utils/getPublicDomain.ts`, line 8**

Change:
```ts
return "https://fastcrm.lovable.app";
```
To:
```ts
return "https://fastcrm.metodopare.ai";
```

This single change will update all portal URLs across the app (B2B portal settings, client invitations, link sharing, etc.) since they all use `getPublicBaseUrl()`.

