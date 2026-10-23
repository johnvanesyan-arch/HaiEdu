# English 7 Unit 1: retained learner verification

**Sprint 16.1C.26 · 2026-10-23 · verified; retained learner journey complete**

The owner requested full learner attempts, playback-limit verification and the writing submission/teacher-feedback cycle. C25 already activated the provisional pilot and verified the read-only learner/staff paths. Existing owner content, audio, scoring and intended-use decisions stand; this slice does not repeat those reviews or close the independent specialist gate.

The manual [learner acceptance workflow](../.github/workflows/english-unit1-learner-acceptance.yml) uses the exact main deployment, recorded activation and existing six dedicated QA identities. Only School A's designated English learner creates learning/writing records. School B supplies foreign-access controls and an unchanged-state comparison. All other programme dashboards are compared before and after. This is synthetic operational evidence, not a learner attainment study.

The run completes one 28-question Diagnostic, ordinary Practice sessions of up to eight questions until all twelve readiness checks pass (at most twelve sessions), and one 28-question Mastery check. Accepted committed response keys are mapped to the actual shuffled presentation. No service key, database readiness override, direct assessment write, reset or recycled form is permitted. Browser and API writes are constrained to the exact enrollment/release/unit, recorded session and current item. Diagnostic/Mastery responses must withhold per-item grading; both completed results must retain all four score groups.

Real private MP3 bytes play at normal speed. Assessed recordings share two completed plays across their related questions; pause/reload must retain progress, refresh must retain the play count, and the server must reject a third play. Practice demonstrates three completed plays. These checks verify delivery and normal player controls, not DRM or human attention. Existing isolated concurrency, interruption, technical unscored-exit and other-form tests remain the evidence for unchanged branches.

The accepted W01 task uses synthetic test text. The run verifies draft save/reload, draft privacy, submission without a pending zero, teacher return, revision/resubmission, four criterion scores, marking and learner-visible feedback. Automatic learning evidence must remain byte-identical through the writing cycle. Teacher history and school analytics must retain the original assessed groups. Attempts, exposures, writing versions and reviews are retained; only authentication sessions created by the run are closed.

This mutating workflow deliberately has **no push or pull-request trigger**. Existing automatic read-only acceptance dependency coverage remains unchanged. Five focused isolated cases cover write scope, presentation mapping, all 200 accepted response projections, bounded continuation and manual/main/deployment/serialization controls. Required CI still includes native Chromium, PostgreSQL, concurrency and aggregate release checks.

If interrupted, the always-uploaded redacted artifact records owned session/work IDs and completed steps. An explicitly selected prior incomplete run artifact may resume only those records. A fresh run fails closed if any unrelated Unit 1 history or work exists. Completed forms are never recreated. Ambiguous writes are inspected before continuation; no blanket retry/reset is used. Reports omit credentials, tokens, response text and audio bytes; screenshots show only designated QA activity.

The results below close this bounded C26 technical delivery. The merged documentation source is the Notion synchronization target; the map is current only after its exact source stamp and content are read back.

## First live run and playback correction

Run [39911840258](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/39911840258), on `08e331142513b9d84f97965277ba429f3e7139f2`, retained six correct Diagnostic answers before audio interruption. Pause/checkpoint/reload succeeded; playback then received a 409. No assessed play completed and all six run-created authentication sessions closed. The incomplete session and source exposure remain retained for continuation.

A controlled isolated reproduction showed that the old SQL compared each media-position increment with the gap between request arrivals. A delayed checkpoint followed by a faster one could reject real-time playback as `audio_progress_invalid`. The replacement anchors media time to the last normal begin/resume and the exact saved position. The five-second lease, monotonic position, 250ms timing tolerance, two-play allowance, idempotent completion and authorization remain enforced. Resume re-anchors time so a paused interval grants no forward-seek credit. Two nullable internal anchor fields preserve existing rows; legacy in-flight rows retain the old timing bound until their next normal begin. The shared SQL service covers every subject using assessed audio; no Edge bundle or browser implementation changes.

Eleven focused tests pass, including the failing timing scenario, forward/backward-seek rejection, resume, expired lease, allowance, ownership and retained history. A native real-browser regression adds a delayed checkpoint through the actual handler/SQL. Required CI on `af1bcf12f2156a7c5e30716e38714da8d9d8558e` passed 1,410 tests, 95 native Chromium cases and all PostgreSQL/concurrency/release jobs (run 39912829994). Production migration `20261023064305` and the function body match the reviewed SQL. All 117 existing table-data fingerprints are preserved across that migration (the two new nullable fields are excluded from the comparison). A separate guarded provenance migration, `20261023070516`, appends runtime build `ae2126d8-7b45-455b-a09b-80dcea0f5586` and advances only the one active assessed-audio binding; model and numerical policies are unchanged. The original Diagnostic retains its original runtime binding; its continuation is explicitly dated in this evidence. Post-fix read acceptance passed 118/118. Run 39915749327 continues the retained session; no completed full journey is claimed before its final evidence.

The migration file is reconciled to its actual deployed timestamp without changing SQL bytes. A source inspection also corrects the live runner to inspect the school endpoint’s existing `analytics.evidenceGroups` envelope and compare earned/possible group totals. This is acceptance-tooling alignment, not a school API contract change.

## Retained continuation checkpoint

Run [39915749327](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/39915749327) completed the original Diagnostic (28 answers), seven ordinary Practice sessions (17 answers, ending on readiness), and one Mastery check (28/28). All twelve skills are ready; exactly one scored Mastery attempt is used. Four assessed recordings complete two plays each, all eight per-question third-play probes return 409, and Practice completes three plays on its first recording. The writing draft, return and second submission are retained. The run passed 544 checks and stopped during writing before marking; no HTTP failure was recorded and all six authentication sessions closed.

The submission wait previously accepted any visible `.written-response`, including the still-visible prior submission during revision. The runner now waits for the submission-success message and the editor to disappear before reading the next state. This explains a possible race; the redacted first failure did not retain an exact assertion stack, so it is not represented as a directly observed error code. The continuation will mark the existing second submission, verify feedback and staff projections, and retain the completed learning work without repeating it. The completed continuation below supersedes this pending checkpoint.

## Completed retained journey

The final continuation [run 39918663688](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/39918663688) passed **90/90** checks on `081dbccdb226a5be41cb4119032e5c00a846ec69`. It resumes the existing records from run 39915749327; it does not recreate completed learning sessions, expose another form or repeat writing submissions. Earlier successful steps remain in their immutable reports. The two previous failed runs are retained as resolved execution history, not presented as passing runs.

| Capability | Verified outcome |
| --- | --- |
| Diagnostic | One retained form, 28/28, all four result groups; six early answers survived the first interruption |
| Ordinary Practice/readiness | Seven sessions, 17 correct responses, all twelve skills ready; normal early completion with no readiness override |
| Mastery | One retained attempt, 28/28, lifecycle passed, four scoped result groups; mobile layout fits |
| Assessed audio | Four real recordings, two completed plays each; all eight third-play probes return 409; shared counts survive item changes/reload |
| Pause and replay | Saved positive pause checkpoint resumes successfully after the timing repair; Practice completes three real plays on one recording and normal playback on related questions |
| Writing | Private draft/reload, no pending zero, first submission, teacher return, revised second submission, four synthetic criterion marks of 2/3, separate 8/12 score and learner feedback |
| Staff and isolation | Teacher results match original groups; school earned/possible totals match; five explicit foreign-access denials; every preserved other-programme/School B dashboard remains identical |
| Retention | Nine sessions and 73 answers, two writing submissions and two reviews retained; only run-created authentication sessions close |

The writing marks deliberately use synthetic test text and are not a language-quality assessment. Its automatic evidence stays byte-identical through writing. The final readback shows no School B English attempts or writing. Reports contain no credentials, tokens, learner-response text or audio bytes.

Required implementation CI [39918020397](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/39918020397) passes 1,410 tests, all 95 native Chromium cases, PostgreSQL 17.6, concurrency and aggregate release checks. The production revision is verified before and after the final continuation. The corrected SQL body, runtime provenance and migration-only 117-table preservation are independently verified. Documentation-only closure reuses this unchanged executable evidence and receives its own required CI/deployment; final merged-source attestation belongs to the Notion readback.

[Consolidated evidence](evidence/english-7-unit-01-learner-verification-20261023.json) · [Diagnostic screenshot](evidence/english-7-unit-01-diagnostic-complete-20261023.png) · [Mastery screenshot](evidence/english-7-unit-01-mastery-complete-20261023.png) · [Writing feedback screenshot](evidence/english-7-unit-01-writing-feedback-20261023.png).

## Next boundary

Continue Unit 2 source/activity and audio preparation in the textbook’s six-unit order. Units 2–6 have no accepted question budgets. Reuse the twenty-recording course inventory and prepare the reviewed smaller Do-Re-Mi delivery copy when that slice needs it. Preserve the 60/56/84 Unit 1 bank and its 58-core/two-optional split. The public exposure disposition, independent specialist/form-equivalence and broader school-pilot gates remain separate. No unseen-assessment, whole-unit mastery or CEFR claim is made; speaking stays classroom-assessed.

[Successful live workflow](evidence/english-7-unit-01-learner-acceptance-20261023.jpg).
