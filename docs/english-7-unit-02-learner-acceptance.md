# English 7 Unit 2 learner acceptance — 16.1C.37

Prepared 2026-10-24. Live execution is pending. This subject-aware QA extension changes no shared runtime, curriculum policy, content approval or release gate.

John's completed Unit 2 approvals and the retained 136/136 read checks plus 54/54 nested isolation checks are reused. This slice verifies actions against the existing provisional pilot, using only the two designated QA schools and normal role authentication. It does not re-audit the owner's reviews or re-listen for content quality.

The manual workflow `english-unit2-learner-acceptance.yml` runs only reviewed `main`, requires the exact deployed frontend and immutable activation/configuration manifests, and shares the existing serialized QA concurrency group. It uses the existing six QA credentials. A separate encrypted `QA_ENGLISH_UNIT2_RESPONSES` fixture supplies accepted responses; only its fingerprint, source fingerprint and 167 allocated identities' count are public. No answer text, source bodies, transcript, credential, signed URL or private object path is written to the report.

## Bounded sequence

1. One 24-question Diagnostic and ordinary Practice (at most twelve eight-question sessions) establish readiness for the nine core skills. W01 must have a matching available learner projection before any attempt; the eight guide projections must match the retained contract after Diagnostic unlocks them.
2. A first Mastery form exercises the normal audio technical-failure exit. The browser aborts one owned audio-load request; the real player reports failure and invokes its normal unscored exit. Answers and source exposure remain retained; no scored attempt is charged.
3. A second Mastery form deliberately answers seven choice questions incorrectly, producing 17/24 and the required Review lifecycle. A normal start request must reject an early retake.
4. One twelve-question Chapter Review opens the second scored attempt. The third Mastery form is answered correctly for 24/24 and the passed lifecycle.
5. Each assessed recording uses two real-time plays; pause/reload resumes from the retained checkpoint, linked questions share the count, and a third play is rejected. Ordinary Practice demonstrates three real plays without an assessed limit. The normal player enforces delivery; the test never fabricates playback-completion events.
6. W01 demonstrates private draft saving/reload, submission without a zero mark, teacher return, student revision/resubmission, four rubric marks and learner-visible feedback. Its synthetic 8/12 is workflow evidence, not a language judgement. Automatic learning evidence must remain identical throughout writing.
7. Teacher results and school aggregates preserve the same earned/possible totals and exclude the unscored exit. Foreign-school probes are denied. Unit 1, other programmes and the other QA student's dashboards remain identical.

All three finite Mastery forms are consumed for this QA learner, including the unscored replacement. Records are retained; no reset, unseen-source claim or learner attainment claim is made. The second Diagnostic form remains unused by this run. Speaking remains classroom-assessed, and the deferred specialist gate remains pending.

## Continuation and evidence

A failed or interrupted workflow uploads a redacted ledger. Only an explicit `resume_run_id` with the same scope, designated learner and private-fixture hash may continue it. Owned completed sessions are reconciled from server history, and an owned technical cancellation is idempotent. An unexpected successful negative-probe start blocks continuation for investigation. No broad cleanup or database mastery override is permitted.

Local preparation: 23 focused checks passed (six new runner/fixture/publication/continuation guards, eleven unchanged Unit 2 read-contract checks and six assessed-audio regressions); all 167 allocated protected response mappings passed without emitting content. The browser QA dependency check passed. Required CI, exact-production execution, independent retained-history readback and source-verified Notion closure must be recorded before claiming this slice complete.

Next content delivery after technical closure: Unit 3, then Units 4–6, following textbook sequence and whole-unit batches. Mathematics 16.2 follows English course closure.

CI investigation: the unchanged reviewer-home mobile layout assertion failed twice while taking two viewport measurements in separate protocol calls during native smooth scrolling. The test now measures both rectangles in one browser evaluation, retaining the original full-width and non-overlap assertions. Product layout, scrolling and production behavior are unchanged. Local browser validation and the new required CI result are recorded at closure.
