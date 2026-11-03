# U1 — teacher evidence investigation, 3 November 2026

Baseline: `2ebb84f8b5d03a0afc23e86ec3a53399de7bf8c2`. Source inspection and isolated synthetic execution only. No production request, SQL, deployment or learning-data change was made. **U1 remains open. The supplied counts cannot identify the real S02/S04 exclusion.**

## Confirmed source findings

Teacher dashboard and learner drawer both use `loadExactInstitutionalClassAnalytics` in `supabase/functions/_shared/institutional-teacher-analytics.ts`. Its database and direct-read paths use the same inclusion contract:

1. Sessions must have `academic_context_status='exact'` and the selected school, year, class, teacher assignment, programme, release and unit-code tuple (direct path around lines 298–307; batched predicate in `20261102182941_teacher_evidence_version_deduplication.sql`, lines 37–42). The enrolled learner and enrollment must match. Governed unit must match, or a null unit must resolve through a blueprint in that unit. A date cutoff alone is not used.
2. The loader builds a `(blueprint ID, item ID)` map via `assessment_blueprint_items.item_version_snapshot` and `item_versions.snapshot.item` (lines 284–285). Before calling the student analytics builder it requires **`row.frozenItem?.skill_id === row.skill_id`** (line 356). Missing blueprint membership, a missing frozen version, or a different frozen skill silently removes an attempt. A still-registered skill then receives zero observations and the existing UI renders «Տվյալ դեռ չկա».
3. The builder excludes unfinished Diagnostic/Mastery assessments, but includes ordinary Practice answers from active or ended sessions (lines 153–160). Policy, model and runtime IDs separate estimates; they are not independently used to discard observations. A missing model produces `provenance_unavailable` with a positive evidence count. Replacing all old/null contracts with the current contract would falsify history.
4. The student course view routes through `routeStudentDashboard` to `service_student_learning_dashboard`; the older fallback in `get-student-dashboard/index.ts` is not the whole path. The selected-context SQL still reads learner/release/skill totals from `student_skill_mastery_by_release` (`20261006083216_sprint_15b12d_student_dashboard_read.sql`, lines 135–145). Its explicit scope is `learner_release_skill`; teacher estimates are `class_contract_evidence`. Their percentages and counts are different metrics and must not be forced to agree by changing mastery thresholds or reattributing old evidence.
5. The brief's school-wide “3 Practice sessions” is **not established** by the source. `web/school-admin.html:100` labels the summary «Ավարտված գլխի կրկնություններ»; `web/school-admin.js:109` reads `chapterReview.completedSessions`. That counts Chapter Review, whereas the teacher's `modeSummary.practice.completed` counts Practice. `web/school-analytics-view.mjs:27` also labels its Chapter Review metric «կրկնություն». Confirm the exact observed element/payload before treating 3 versus 7 as an aggregation defect.

## Reproduction and safe diagnostic

`tests/teacher-evidence-investigation.test.mjs` runs the real teacher loader and presentation function with synthetic data. Two post-enrollment Practice answers (S02-shaped fixture), or one (S04-shaped), disappear when their referenced frozen version is absent even though another frozen item registers the skill. Restoring the matching frozen version makes the same attempts count. The tests also cover blueprint membership, skill mismatch, incomplete assessments, active Practice, null governed units, null policy/runtime provenance, malformed exports and output redaction. **This proves a possible mechanism, not which mechanism affected the real learner.**

The offline inspector accepts an owner-supplied JSON file or stdin:

```sh
node scripts/inspect-teacher-evidence.mjs /private/path/u1-evidence.json
node scripts/inspect-teacher-evidence.mjs < /private/path/u1-evidence.json
```

Input has one `student: {id, enrollmentId}`, a complete `context: {schoolId, academicYearId, classId, assignmentId, subjectProgramId, curriculumReleaseId, unitId, unitCode}`, and arrays `sessions`, `attempts`, `blueprintRows`, `blueprintItems`, `versions`. Field names within the arrays match the database columns. The prepared [owner-run read-only export](u1-evidence-export.sql) selects only the reported learner and release, requires a unique enrollment, and omits names, email, answers and question text. Do not commit an actual export. Other enrollment candidates are intentionally not guessed.

Output contains per-skill observed/included totals and exclusion categories. It creates no client and cannot connect to a database. It is an investigation aid, not an authorization check, score estimator or proof of production schema equivalence. Actor authorization, roster checks and clock expiry remain the live handlers' responsibility. A zero-observation output alone cannot prove that the owner supplied every relevant row.

## Decision and remaining work

**Do not change evidence behavior yet.** The report does not include S02/S04's enrollment attribution, blueprint item/version keys, frozen skill or parent-session status. Therefore neither (a) a projection bug nor (b) intentional exclusion has been demonstrated for those rows. Read-only production access is also outside the supplied brief's authorization.

Next, use the private export (or obtain explicit scoped read-only authorization), map the affected skill UUIDs to the known skill codes, and report the precise failing predicate and row counts. If valid evidence was dropped, add the actual failing regression and repair that projection in a new migration where necessary. If exclusion is intentional, preserve inclusion/scoring and propose accurate Armenian labels for excluded observations, with John's wording decision. Make learner-wide versus class-scoped counts explicit across student, teacher, School Admin and Master Admin consumers. Verify the alleged school counter against the same mode and context first.

Any later shared-helper change must audit both importing Edge functions (`get-teacher-dashboard`, `get-teacher-student`) and their deployed bundles at the owner-authorized deployment handoff. This investigation changes neither helper. B.12.3/B.12 and the English C47/subject-expansion hold remain open. No native-browser, fresh live, owner usability or content approval is claimed.

Validation at preparation: six focused investigation tests pass. `npm run typecheck` and the full `npm test` suite also pass: 1,665 tests, zero failures, skips or cancellations (Node 24.22.1 locally). Current-source GitHub CI and owner review remain distinct from production acceptance.
