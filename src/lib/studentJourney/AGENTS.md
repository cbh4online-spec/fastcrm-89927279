# Student Journey import & consolidation

- Historical imports go only through `sj_import_preview` → `sj_import_record_decision` (persisted, fingerprinted, reasoned) → `sj_import_historical_rows(_workspace_id,_cohort_id,_batch,_rows)`, all gated by `sj_import_is_manager` (current membership), because browser-sent IDs or flags must never decide identity.
- Hard identity conflicts are never overridable; no new contact/profile is created when candidates exist; archived profiles resolve via `sj_canonical_profile`, so re-imports after a merge never duplicate.
- Every occurrence needs labels mapped in `sj_import_label_maps` to the same edition (exact normalized match only), because fuzzy mapping mixed formations.
- Provenance lives in `sj_import_provenance`; only the historical RPC may bypass the completion-requires-attendance guard, per targeted enrollment.
- Profile consolidation only via `sj_profile_merge_preview` → `sj_profile_merge` (same-workspace dependents, collisions recorded as blocked, source archived via `merged_into_profile_id`, reversible by `sj_profile_merge_revert`); never `useContactMerge`, which deletes.
- Lists hide `archived_at` profiles; enrollments with no amounts/plan show «Não informado» via `isFinanceUnknown`, never 0 €.
- Write/rollback tests run only in PGlite (`src/test/studentJourney/historicalImportDb.test.ts`), never against production.
