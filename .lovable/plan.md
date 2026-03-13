

# Plan: Fix RLS Policy Always True (SUPA_rls_policy_always_true)

## Problem
50+ RLS policies use `USING(true)` or `WITH CHECK(true)` for INSERT, UPDATE, DELETE, or ALL operations. While some are legitimately public (analytics tracking, public forms), many grant excessive access — especially `FOR ALL` policies on `{public}` role that were intended for service role operations only.

## Strategy

Categorize policies into 3 groups and apply appropriate fixes:

### Group 1: Remove "FOR ALL" service-role policies (highest risk)
These tables are only written by Edge Functions via service_role (which bypasses RLS anyway), so the `FOR ALL USING(true)` policies are unnecessary and dangerous.

| Table | Policy to Drop | Replacement |
|-------|---------------|-------------|
| `ai_agent_locks` | "Service role can manage locks" | Workspace member SELECT only |
| `conversation_objective_progress` | "System can manage progress" | Workspace member SELECT only |
| `lead_behavior_signals` | "Service role full access" | Workspace member SELECT only |
| `message_length_events` | "Service role full access" | Workspace member SELECT only |
| `demo_leads` | "Service role can manage demo_leads" | Keep public INSERT, add workspace member SELECT/UPDATE/DELETE |

### Group 2: Tighten UPDATE policies
| Table | Current Policy | Fix |
|-------|---------------|-----|
| `event_test_cases` | Authenticated can update (true) | Scope to authenticated only (already is, but add workspace check) |
| `event_decision_matrix` | Authenticated can manage ALL (true) | Split into workspace-scoped CRUD |
| `gdpr_consents` | Visitors can update own consent (true) | Scope to own `visitor_id` match |
| `module_usage` | System can update (true) | Workspace member only |
| `store_referrals` | System can update (true) | Workspace member only |
| `store_visitor_sessions` | Visitors can update own session (true) | Scope to own `session_id` match |

### Group 3: Restrict INSERT policies to proper roles
Many INSERT policies use `{public}` role but are meant for service-role Edge Functions. These will be restricted to `service_role` or scoped properly:

**Service-only inserts** (drop policy — service_role bypasses RLS):
- `activity_logs`, `admin_notifications`, `ai_memory_access_log`, `conversation_rule_executions`, `journey_transitions`, `loyalty_points_transactions`, `module_action_logs`, `module_usage`, `order_audit_log`, `proposal_activity_logs`, `proposal_analytics`, `rag_retrieval_metrics`, `store_referrals`, `usage_events`

**Legitimately public inserts** (keep WITH CHECK but add workspace_id validation where possible):
- `bio_events`, `c2c_affiliate_clicks`, `c2c_public_offers`, `community_membership_answers`, `fastclub_applications`, `fastcrm_proposals`, `funnel_submissions`, `gdpr_consents`, `seo_page_analytics`, `store_coupon_usage`, `store_offers`, `store_orders`, `store_page_views`, `store_product_alerts`, `store_visitor_sessions`, `vertical_landing_events`, `widget_conversations`, `widget_messages`

## Implementation

A single database migration that:
1. Drops all overly permissive policies listed above
2. Re-creates them with proper scoping using workspace membership checks or removes them entirely when only service_role needs access
3. Uses `public.is_super_admin(auth.uid())` for super admin bypass where appropriate (following existing pattern)

## Risk Mitigation
- Service role bypasses RLS, so removing "system" policies won't break Edge Functions
- Public-facing features (widget, store, forms) retain anonymous INSERT but with workspace_id constraints where the column exists
- All authenticated operations get workspace membership scoping

