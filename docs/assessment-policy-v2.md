# Versioned assessment scope — Sprint 15C.15

**Owner-approved 2026-10-15 · Roadmap 3.79 · Implemented, deployed and production-verified.**

The former runtime included every answered item in the pass denominator and every frozen skill in first-attempt readiness. That could make supporting/additional knowledge compulsory. John approved the [Chapter III contract](chapter-iii-assessment-contract-proposal.md) at 20:02:38 Asia/Yerevan on 2026-10-15.

## Contract and consumers

`haiedu-assessment-policy-v2` adds explicit delivered, scored and readiness-required skill sets, plus labelled reporting groups that partition delivery. Scored sets cannot split a reporting group. Mode/scope/coverage/model/lifecycle validation, immutable bindings, response types and whole-form protection remain enforced. The historical SQL validator function name dispatches both closed versions for API compatibility; v1 rules and bound histories remain unchanged.

Only Mastery has pass/readiness sets. All delivered questions still require a response. V2 compares the exact scored fraction with the threshold, then applies configured per-skill minima. Finalization independently recomputes the expected pass and score from the original binding and answered items. Failed-skill targets contain scored skills only. The existing readiness model is unchanged: secure score and evidence count OR recent recovery. Required Chapter Review still qualifies by completion and keeps the same retry lifecycle; non-gating errors create no additional retry lock.

Completed sessions save `assessmentResultReporting` in metadata. Learner player/history, teacher latest results/history and school contract aggregates read the separate scales. The pass score never shares a denominator with the descriptive overall accuracy. Active assessments do not expose running correctness. The generic core has no Physics IDs, chapter counts or language-specific policy keys. Group labels are chapter configuration, escaped on display. No result certifies laboratory performance.

The [approved Chapter III configuration](evidence/chapter-iii-assessment-v2-configuration-20261015.json) defines 16-question D/M forms, 8-question Practice, 12-question Chapter Review, and the 10/2/4 distribution. It is a configuration recipe, not an active model, policy binding or allocated form. Model/lifecycle IDs and qualified forms must be bound during separately authorized release preparation. Existing Chapter I/II configurations are unchanged.

## Verification and deployment boundary

Local SQL integration verifies the three approved 16-question pass/fail cases, mandatory-only readiness, all-response completion, saved/reloaded group results, required review and disjoint retry forms, unchanged v1 all-skill readiness/denominator, and a different subject with three delivered / one scored question. JS/SQL reject duplicate/missing/foreign scope and invalid grouping. Staff loaders and aggregates are exercised against saved SQL results. The new suite is also required on PostgreSQL 17.6 CI; native Chromium covers learner instructions, all 16 answers, result reload and mobile history.

All 14 affected Edge Functions are deployed; their 104 runtime files match the reviewed source, with all existing JWT settings retained. All nine SQL bodies and execution grants match. Two new runtime provenance records identify implementation commit `cced20d97879d9a616aaf42981e4637c365f614f`; only the two active implementation pointers and their notes/timestamps changed. All 24 older builds, frozen session provenance, learning criteria, approvals and content remain unchanged. The provenance connector returned invalid requestState; the exact guarded DML and migration-history entry were committed atomically through execute_sql after the SQL migration had succeeded through apply_migration.

## Verified release evidence

Implementation PR #227 and preservation PRs #228–229 passed CI, PostgreSQL 17.6, native Chromium and aggregate Platform release checks. The final suite contains 1,293 Node tests and 68 browser tests. Isolated v2 acceptance covers the approved 16-answer cases and a different subject configuration; production acceptance preserves the currently active v1 Chapter I/II pilots. Production v2 learner completion is deliberately not claimed because Chapter III remains inactive.

Authenticated production chapter acceptance passed on the exact reviewed frontend commit, including both schools, desktop/mobile Chapter I → II → I switching, protected-data denials and unchanged before/after evidence. Staff action and school analytics acceptance also passed. The initial read acceptance stopped at an obsolete pristine-account assumption: a valid unanswered diagnostic already existed from October 13. The corrected runner accepts only a valid incomplete diagnostic, verifies its resume UI instead of absent launch cards, and preserves the practice lock and exact before/after state; no learner session was deleted or created.

All 49 table inventories matched after the SQL/Edge deployment. After provenance recording, 47 table inventories still match; the remaining two contain only the intended append/pointer changes, with old rows preserved. Security-advisor findings are unchanged after excluding observation timestamps. [Durable evidence](evidence/assessment-policy-v2-release-20261015.json) records source hashes, migrations, deployed versions, CI and authenticated reports.

Chapter III stays draft/inactive, with zero qualified forms and independent SME/exposure gates open. No question, hint or guide wording changed. Next is a bounded authoring manifest, not automatic release. Documentation is aligned in roadmap 3.79; Notion is synced and read back against the merged documentation commit during closeout.
