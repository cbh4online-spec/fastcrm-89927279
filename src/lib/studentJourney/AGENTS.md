# Student Journey import & consolidation

- Historical imports go only through `sj_import_preview` → `sj_import_record_decision` (persisted, fingerprinted, reasoned) → `sj_import_historical_rows(_workspace_id,_cohort_id,_batch,_rows)`, all gated by `sj_import_is_manager` (current membership), because browser-sent IDs or flags must never decide identity.
- Hard identity conflicts are never overridable; no new contact/profile is created when candidates exist; archived profiles resolve via `sj_canonical_profile`, so re-imports after a merge never duplicate.
- Every occurrence needs labels mapped in `sj_import_label_maps` to the same edition (exact normalized match only), because fuzzy mapping mixed formations.
- Provenance lives in `sj_import_provenance`; only the historical RPC may bypass the completion-requires-attendance guard, per targeted enrollment.
- Profile consolidation only via `sj_profile_merge_preview` → `sj_profile_merge(…, _preview_fingerprint, _evidence_note)` (pairwise identity proof: shared identifier or written evidence, incompatible names/NIF/e-mails block, same-workspace dependents, collisions recorded as blocked, source archived via `merged_into_profile_id`, reversible by `sj_profile_merge_revert`); never `useContactMerge`, which deletes.
- Lists hide `archived_at` profiles; enrollments with no amounts/plan show «Não informado» via `isFinanceUnknown`, never 0 €.
- Write/rollback tests run only in PGlite (`src/test/studentJourney/historicalImportDb.test.ts`), never against production.
- Name similarity is always a review hint in `sj_import_classify`, never an automatic link; «é outra pessoa» is allowed only against name-only candidates via a recorded decision, because homonyms must neither merge nor silently duplicate.
- Profile course stats come only from `sj_recompute_profile_course_stats` (all enrollments, known dates only, never now()); lifecycle moves to completed only from active/enrolled with no other open enrollment, so history never invents dates or ends active courses.
