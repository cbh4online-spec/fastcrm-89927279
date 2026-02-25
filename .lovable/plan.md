

# Domain Auto-Link: Contact → Company

## What It Does

When creating a contact with an email (e.g. `user@acme.com`), automatically look up companies in the same workspace where `domain = 'acme.com'`. If found, set `company_id` on the new contact.

## Implementation

### Single file change: `src/hooks/useContacts.ts`

Modify the `createContact` mutation (lines 105-133) to:

1. Extract domain from the provided email (strip everything before `@`)
2. If no `company_id` was explicitly provided and an email exists:
   - Query `companies` table for a matching `domain` in the same workspace (case-insensitive, `deleted_at IS NULL`)
   - If exactly one match found, use that company's `id` as `company_id` and its `name` as `company`
3. Proceed with the insert using the resolved `company_id`

```text
createContact flow:
  email provided? ──► extract domain
  company_id already set? ──► skip lookup
  query companies WHERE lower(domain) = lower(extracted_domain) ──► found?
    yes ──► set company_id + company name
    no  ──► proceed without company_id
```

### Edge case: `store-capture-lead` edge function

The `supabase/functions/store-capture-lead/index.ts` also creates contacts. Add the same domain-matching logic there: after determining the contact, if no `company_id` is set, check for a company with matching domain and update the contact.

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useContacts.ts` | Add domain extraction + company lookup before insert in `createContact` |
| `supabase/functions/store-capture-lead/index.ts` | Add domain auto-link after contact creation |

### No DB changes needed

The `companies.domain` column and the unique index `(workspace_id, lower(domain))` already exist from the previous migration.

