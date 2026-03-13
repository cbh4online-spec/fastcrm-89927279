

# Plan: Fix Function Search Path Mutable (SUPA_function_search_path_mutable)

## Problem
21 functions in the `public` schema lack an explicit `search_path` setting. Without it, a malicious user could manipulate the search path to hijack function calls — especially dangerous for `SECURITY DEFINER` functions (6 of the 21).

## Solution
A single migration that runs `ALTER FUNCTION ... SET search_path = public;` for all 21 functions. This is non-destructive — it only adds the config parameter without changing any function logic.

## Affected Functions

**Security Definer (highest priority):**
1. `fn_companies_audit_trigger()`
2. `fn_contact_audit_trigger()`
3. `fn_notify_team_note()`
4. `get_lifecycle_metrics(uuid)`
5. `process_goods_receipt_item_v3()`

**Regular functions:**
6. `fn_companies_clamp_scores()`
7. `fn_contact_validate_scores()`
8. `fn_lifecycle_auto_transition()`
9. `fn_notify_lifecycle_transition()`
10. `generate_workflow_idempotency_key(uuid, text, uuid)`
11. `get_source_priority(text)`
12. `invalidate_deal_intelligence_cache()`
13. `record_product_initial_price()`
14. `record_product_price_change()`
15. `set_opportunity_won_at()`
16. `set_source_priority()`
17. `update_pipelines_updated_at()`
18. `update_updated_at_column()`
19. `validate_enrollment_status()`
20. `validate_event_decision_matrix_priority()`
21. `validate_extension_audit_action()`

## Implementation
One `ALTER FUNCTION` statement per function, all in a single migration. No function recreation needed — `ALTER FUNCTION ... SET search_path = public` preserves existing logic.

