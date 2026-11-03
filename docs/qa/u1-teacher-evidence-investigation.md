# U1 — recorded answers and unavailable frozen evidence

3 November 2026 (Asia/Yerevan). Baseline `2ebb84f8b5d03a0afc23e86ec3a53399de7bf8c2`; initial investigation checkpoint `6ab45023b721f5f48c4801ceae265ffae5e2eb52`. John explicitly authorized narrowly scoped read-only production metadata inspection after that checkpoint. The initial source checkpoint below precedes the now-applied production rollout recorded in the next paragraph.

**Current production outcome — 3 November 2026:** all174 source-verified missing snapshots are recovered, publication/reference guards are live, and both analytics consumers/frontend match source. Exact scoped database evidence is now60 recorded/60 countable, including S02=4/4 and S04=3/3; saved learning/content/approval rows are preserved. The initial investigation and presentation-only decision below are historical checkpoints. See [the executed rollout, preservation proof and live-QA limits](u1-rollout-20261103.md).

## Confirmed cause and decision

The selected learner/release export identifies one enrollment, nine sessions and 60 answers. The exact academic/enrollment/unit predicates admit all 60. A second grouped SELECT confirms that 49 answers have blueprint membership but **no matching `item_versions` row**; there are no missing-membership or frozen-skill-mismatch exclusions in this export. Both S02 Practice answers and the one S04 Practice answer are among the missing versions. Each skill also has two Diagnostic answers whose versions are missing.

The baseline loader at `supabase/functions/_shared/institutional-teacher-analytics.ts:356` drops any attempt failing `row.frozenItem?.skill_id === row.skill_id`. Its map at lines 284–285 resolves `(session blueprint, item)` through `item_version_snapshot` to `item_versions.snapshot.item`. That exact missing-version condition explains the reported zero teacher observations. This is not a date cutoff, hint filter, null-contract filter or enrollment mismatch.

| Skill | Recorded answers | Usable frozen observations | Missing frozen version |
|---|---:|---:|---:|
| S01 | 6 | 1 | 5 |
| S02 | 4 | 0 | 4 |
| S03 | 10 | 2 | 8 |
| S04 | 3 | 0 | 3 |
| S05 | 9 | 2 | 7 |
| S06 | 2 | 0 | 2 |
| S07 | 20 | 6 | 14 |
| S08 | 2 | 0 | 2 |
| S09 | 2 | 0 | 2 |
| S10 | 2 | 0 | 2 |
| Total | 60 | 11 | 49 |

The nine sessions comprise one completed Diagnostic, seven completed Practice sessions and one active Practice session. Of the 49 missing snapshots, 20 belong to Diagnostic and 29 to Practice answers. All 49 current item version numbers still match the corresponding blueprint versions, but present mutable item content does not prove the historical snapshot. No names, email addresses, learner answers, question text or raw learner export are committed. The [sanitized finding receipt](../evidence/u1-evidence-readonly-20261103.json) contains aggregate counts only.

**Decision recorded in PR397 before behavior edits:** keep frozen-version eligibility for score estimation and correct the false no-data presentation. This is a presentation/data-completeness bug around an intentional scoring guard. Reuse the existing neutral «Ցուցանիշը հասանելի չէ» label for recorded answers lacking historical metadata. Do not reconstruct snapshots from current items, change readiness/pass decisions or combine original contracts. Missing historical snapshots remain a separate data-governance repair; this patch does not restore them or produce new classifications from them.

## Behavior and API contract

The exact-class loader now preserves recorded attempts into the analytics builder. The builder first applies the existing learner/enrollment/session and assessment-completion rules, then separates matching frozen observations from those without a matching frozen skill. Incomplete Diagnostic/Mastery answers still contribute neither displayed count nor score; active ordinary Practice remains observable under the existing rule.

Existing `evidenceCount`, scores, bands, estimates and original-contract grouping retain their meaning. Additive fields are:

| Location | Field | Meaning |
|---|---|---|
| Skill matrix and short skill rows | `observedEvidenceCount` | Authorized, visible recorded answers for the selected class/enrollment/release/unit/skill. |
| Skill matrix and short skill rows | `excludedEvidenceCount` | Those recorded answers lacking a matching frozen item/skill; `observedEvidenceCount - evidenceCount`. |
| Student analytics | `observedAttempts` | Recorded answers after the same visibility rules. |
| Student analytics | `excludedEvidenceCount` | Recorded answers excluded from frozen observation estimates. |

When recorded answers exist but zero frozen observations are available, the skill has `status: provenance_unavailable`, `band: not_assessed`, no percentage and no estimate. It is not an empty skill. Partial coverage retains the original estimate calculated from matching frozen observations, with a disclosure of recorded versus counted answers. A skill remains visible from its recorded scoped attempt plus immutable release skill registry even when all its frozen versions are absent; current item content is never read as fallback. Unregistered skills cannot acquire a release label.

The teacher matrix retains neutral styling and opens its existing keyboard-accessible drawer. Details show recorded and counted totals and explain the missing historical data. Support filters/counts still use only actual configured classifications. Student Course and Progress views identify their learner/release history scope. No pass/fail, readiness, scoring, model or content rule changes.

## One cross-role counting rule

Every metric must name its unit and scope; percentages with different populations or original contracts must not be combined to force equality.

- Student skill estimates are cached `learner_release_skill` learning-history indicators. They are not a replay of one teacher/class's frozen evidence.
- Teacher recorded counts use the selected exact class/enrollment/release/unit and the original assessment visibility rules. Teacher estimates use only matching frozen observations, separated by original contract. Recorded-but-unclassifiable answers are explicit.
- School Admin and Master Admin count authorized sessions under their selected filters; evidence groups retain mode and original contract. Their Chapter Review summary counts completed Chapter Reviews. The cited school summary is labelled «Ավարտված գլխի կրկնություններ» in `web/school-admin.html:100` and reads `chapterReview.completedSessions` at `web/school-admin.js:109`; `web/school-analytics-view.mjs` uses the same metric. The alleged school-wide 3-versus-7 Practice discrepancy is unconfirmed and must be compared against a Practice metric with matching scope, not the Review summary. This investigation did not query school-wide learner data.

## Verification and affected consumers

Both Edge consumers of the helper are affected: `get-teacher-dashboard` (through both `teacher-dashboard-batch.ts` and `institutional-teacher-dashboard.ts`) and `get-teacher-student`. Both read paths execute the same builder. The presentation patch itself changes no SQL function, schema, RLS policy or error/status contract. The canonical browser module is `web/teacher-skill-evidence.mjs`; its generated `teacher-dependencies.bundle.mjs` is rebuilt. The student scope sentence changes `web/course-page.js` only. The registered schoolless adapter retains its separate existing path.

Regressions exercise the actual loader/presentation, missing membership/version/skill, no frozen versions for a whole skill, S02/S04-shaped counts, partial coverage preserving the prior estimate, unfinished assessments, active Practice, original contract separation and redacted offline input/output. A disposable SQL regression deletes all relevant frozen versions, compares both real teacher read paths and verifies another subject's evidence stays intact. Native browser cases cover keyboard drawer access, 375 px/200% neutral recorded counts, and learner scope on Course/Progress without starting a learning session. Existing two-school authorization/roster-revocation and batched parity tests remain.

The initial checkpoint passed all five CI gates ([run41582853411](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41582853411)), 1,665 local tests and typecheck. Those results predate the behavior patch. Current-source full tests, generated-bundle parity, syntax, trigger coverage and required Node22/browser/PostgreSQL/aggregate CI are recorded in PR397. Local Chromium is unavailable; the new native cases require actual CI execution and are not claimed from VM tests.

## Historical handoff prepared before the production rollout

After owner review and passing current-source CI, the owner controls merge/deployment. Deploy both affected Edge functions with the shared helper and verify all deployed bundle files; merging one helper alone does not update existing functions. Verify exact frontend/bundle source, then make a scoped read-only teacher check: S02 must show four recorded/zero counted answers and S04 three/zero, both unavailable rather than no-data. Do not create learner responses or modify historical data for acceptance. Missing-snapshot recovery requires independent governed evidence and owner review.

B.12.3/B.12, final owner usability and the English C47/subject-expansion hold remain open. This work performs no production mutation, live acceptance dispatch, merge or deployment; fresh signed-in UI acceptance of the patch is unexercised. Notion synchronization follows an authorized merged source checkpoint, not this draft.

The offline inspector remains usable with `node scripts/inspect-teacher-evidence.mjs < private-export.json` or a file path. The [prepared read-only export](u1-evidence-export.sql) requires owner authorization to run on production, refuses ambiguous enrollment selection, and excludes question/answer/personal text. Never commit an actual learner export. Its generic output does not itself attest production provenance; the confirmed finding above comes from the explicitly authorized export and independent grouped SELECT.
