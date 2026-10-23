# English 7 Unit 1: retained learner verification

**Sprint 16.1C.26 · 2026-10-23 · prepared; live result pending**

The owner requested full learner attempts, playback-limit verification and the writing submission/teacher-feedback cycle. C25 already activated the provisional pilot and verified the read-only learner/staff paths. Existing owner content, audio, scoring and intended-use decisions stand; this slice does not repeat those reviews or close the independent specialist gate.

The manual [learner acceptance workflow](../.github/workflows/english-unit1-learner-acceptance.yml) uses the exact main deployment, recorded activation and existing six dedicated QA identities. Only School A's designated English learner creates learning/writing records. School B supplies foreign-access controls and an unchanged-state comparison. All other programme dashboards are compared before and after. This is synthetic operational evidence, not a learner attainment study.

The run completes one 28-question Diagnostic, ordinary eight-question Practice sessions until all twelve readiness checks pass (at most twelve sessions), and one 28-question Mastery check. Accepted committed response keys are mapped to the actual shuffled presentation. No service key, database readiness override, direct assessment write, reset or recycled form is permitted. Browser and API writes are constrained to the exact enrollment/release/unit, recorded session and current item. Diagnostic/Mastery responses must withhold per-item grading; both completed results must retain all four score groups.

Real private MP3 bytes play at normal speed. Assessed recordings share two completed plays across their related questions; pause/reload must retain progress, refresh must retain the play count, and the server must reject a third play. Practice demonstrates three completed plays. These checks verify delivery and normal player controls, not DRM or human attention. Existing isolated concurrency, interruption, technical unscored-exit and other-form tests remain the evidence for unchanged branches.

The accepted W01 task uses synthetic test text. The run verifies draft save/reload, draft privacy, submission without a pending zero, teacher return, revision/resubmission, four criterion scores, marking and learner-visible feedback. Automatic learning evidence must remain byte-identical through the writing cycle. Teacher history and school analytics must retain the original assessed groups. Attempts, exposures, writing versions and reviews are retained; only authentication sessions created by the run are closed.

This mutating workflow deliberately has **no push or pull-request trigger**. Existing automatic read-only acceptance dependency coverage remains unchanged. Five focused isolated cases cover write scope, presentation mapping, all 200 accepted response projections, bounded continuation and manual/main/deployment/serialization controls. Required CI still includes native Chromium, PostgreSQL, concurrency and aggregate release checks.

If interrupted, the always-uploaded redacted artifact records owned session/work IDs and completed steps. An explicitly selected prior incomplete run artifact may resume only those records. A fresh run fails closed if any unrelated Unit 1 history or work exists. Completed forms are never recreated. Ambiguous writes are inspected before continuation; no blanket retry/reset is used. Reports omit credentials, tokens, response text and audio bytes; screenshots show only designated QA activity.

Live results, deployment/CI identifiers and the source-verified Notion closure will be recorded here after execution. C25 remains the completed checkpoint until then.
