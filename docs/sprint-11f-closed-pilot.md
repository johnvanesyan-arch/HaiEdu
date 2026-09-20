# Sprint 11F — Grade 7 Physics Chapter I Technical Handoff Readiness

**Status: ✅ Complete for Sprint 11 technical handoff.**  
**Opened:** 2026-09-16  
**Last updated:** 2026-09-20  
**Scope:** final production/browser smoke and technical handoff readiness for Sprint 11. Human tester/cohort execution and formal real-user evidence review are deferred to Sprint 11.5.

## Objective

Run Grade 7 Physics Chapter I as a controlled production pilot without weakening the assessment-integrity, security, privacy, deterministic-grading, or evidence-provenance guarantees completed in Sprint 11A–11E.

Sprint 11F is primarily an operational validation sprint. It must distinguish three kinds of evidence:

1. **Technical preflight evidence** — source/CI/database/security checks that can be verified without a real cohort.
2. **Rendered production evidence** — authenticated browser/device/keyboard smoke testing in the deployed application.
3. **Human pilot evidence** — observed student/teacher use and feedback from a controlled cohort.

Passing one category must not be represented as passing the others.

## 11F.1 — Technical preflight

**Status: ✅ Complete.**

The pre-pilot QA report in `docs/pre-sprint-11f-qa.md` established the current technical baseline after Sprint 11E.

Verified at the opening of 11F:

- repository CI passes after the pre-pilot regression fix;
- the current production deployment is successful;
- Chapter I has 240 active pilot-eligible variants across 10 skills;
- active pool capacity is 120 Practice / 40 Diagnostic / 80 protected Mastery variants;
- the two active Diagnostic v2 forms contain 20 items each, exactly 2 items per skill, with zero exact overlap;
- no active Chapter I item is missing Armenian prompt text, answer-key provenance, curriculum scope, or normalized variant identity;
- Practice, Diagnostic, and Mastery pools have no cross-purpose item overlap;
- protected Mastery content remains outside ordinary learner-facing item read paths;
- no learner/unit currently has more than one active learning session;
- `start-learning-session` now preserves an active different-mode session and returns `409 active_session_conflict` rather than silently abandoning it.

Live pilot-readiness snapshot on 2026-09-16:

- 1 admin profile;
- 1 content-admin profile;
- 1 teacher profile;
- 2 student profiles;
- 4 active accounts and 1 suspended account;
- 2 active classes;
- 1 current class membership;
- 0 duplicate active learner/unit session groups.

These are readiness/test-state counts, not a claim that a real pilot cohort has been recruited.

## 11F.2 — Authenticated browser/device production smoke

**Status: ✅ Complete via executed rendered QA plus explicit product-owner acceptance of four remaining tool-coverage limitations.**

The production application was tested in a real rendered browser against `https://armenian-mastery-platform.vercel.app/` using strict browser automation and prepared authenticated student and teacher Browser Context Profiles.

Executed rendered evidence:

- public landing/login and role-entry surfaces rendered successfully;
- public desktop, tablet-width and phone-width responsive layouts rendered without blocking defects;
- public 200% zoom/text-scaling and long-Armenian wrapping checks passed;
- public keyboard-accessibility surface checks passed;
- authenticated student Home, Physics 7, Progress, Practice, Diagnostic, Mastery and Privacy surfaces rendered successfully without submitting answers or intentionally changing learner evidence;
- an existing active Practice session remained intact while Diagnostic correctly presented the collision guard instead of replacing the active session;
- authenticated teacher dashboard, class list, populated and empty class details, authorized student detail/progress, skill matrix and intervention signals rendered successfully;
- teacher-visible counts and skill data were internally consistent across the inspected views;
- no confirmed blocking rendered defect remained after verification. A browser-agent OCR/paraphrase report of an incorrect recovery label was cross-checked against the rendered Progress state and production source; the actual recovery label is `Վերջին փորձերում կայուն`, while `Ամրապնդված` remains reserved for mastery completion.

The following four matrix items were **not executed in authenticated state because the browser automation did not expose the required controls**. On 2026-09-16 the product owner explicitly accepted them as QA limitations/workarounds for Sprint 11F.2 rather than requiring further execution:

1. authenticated tablet/phone viewport run;
2. authenticated keyboard-only focus traversal;
3. authenticated 200% zoom/text-scaling run;
4. authenticated Firefox/Safari-class browser run.

These four items are **accepted deferrals, not PASS results**. Public responsive/zoom/accessibility coverage exists, and authenticated desktop student/teacher rendering passed. The accepted limitation applies only to the missing authenticated repetitions of those checks.

State-changing workflow assertions such as answer submission, remediation completion, full Diagnostic/Mastery completion, and destructive account/privacy operations remain intentionally outside 11F.2 and belong to the workflow smoke in 11F.3.

Detailed operational checklist: `docs/pilot-browser-qa-checklist.md`.

## 11F.3 — Final production workflow smoke

**Status: ✅ Complete via live evidence plus explicit accepted dispositions.**

The original plan required a disposable test/pilot learner account. During execution, the prepared browser profile still resolved to the existing Hovhannes Vanesyan student account. On 2026-09-16 the product owner explicitly authorized continued use of that account for the state-changing 11F.3 smoke. This is an accepted exception to the disposable-account requirement; resulting learning evidence must therefore be treated as QA-modified evidence rather than untouched learner history.

### Executed successfully

Teacher-side setup through the production UI:

- teacher authentication confirmed;
- created one disposable class named `QA 11F3 E2E` for academic year `2026-2027`;
- generated join code `YKVXYDSB`;
- class verified active with 0 students immediately after creation;
- no existing non-QA class was intentionally modified during class creation.

Student-side workflow through the production UI:

- Hovhannes Vanesyan joined `QA 11F3 E2E` using the normal join-code flow;
- join success message rendered correctly;
- an existing active Practice session was resumed rather than replaced;
- Help/remediation UI was exercised during Practice;
- the bounded Practice session completed through the designed `mastery_reached` early-completion path after 5/5 correct responses, ending at 5 of 8 planned items rather than forcing unnecessary additional questions;
- one full 20-item Chapter I Diagnostic completed successfully;
- production database state confirms that completed Diagnostic recorded 20/20 answered and 13 correct (65%);
- no per-item correctness feedback was observed before the Diagnostic completion state.

### Disposition of the second Diagnostic

On 2026-09-18 the stale second Diagnostic session was explicitly classified as an automation-navigation artifact and changed from `active` to `abandoned`.

The disposition preserved the session and all four recorded responses. It added a QA disposition reason rather than deleting or rewriting the evidence. Post-disposition production verification confirmed:

- no active Chapter I learning session remained for the learner;
- the valid completed Diagnostic remained 20/20 answered, 13 correct (65%);
- Home and Progress both showed the same 13/20 result and the same 5/10 current-skill summary;
- Physics 7 opened normally from the learner shell;
- the learner account was denied the teacher route and returned to the learner Home.

### Mastery eligibility verification

The production Mastery route rendered normally and correctly remained closed. The gate identified five unfinished skills:

- `PHY7-U01-S02`;
- `PHY7-U01-S04`;
- `PHY7-U01-S07`;
- `PHY7-U01-S08`;
- `PHY7-U01-S09`.

No Mastery session was started or completed because eligibility was not legitimately available. This is a PASS for the ineligible-state gate, not evidence for Mastery start/resume/completion.

### Closure evidence — 2026-09-20

The remaining 11F.3 residuals are closed for technical handoff:

- **Teacher evidence verification — PASS.** The QA learner remains inside an active teacher-owned Physics class, live learner evidence was verified in the database, and the deployed teacher-student endpoint enforces teacher/class membership before returning student evidence.
- **Mastery lifecycle — accepted disposition.** The legitimate Mastery-ineligible state remains a PASS. Eligibility was not forced or manufactured. Full start/resume/completion is deferred to the authorized exact-release Sprint 11.5 cohort if it does not arise naturally.
- **Suspension/session revocation — PASS by production evidence.** The security audit log records successful suspension and reactivation. Suspension bans the Auth user; protected learning functions validate active account state, a live matching auth session, and a non-banned user through `service_validate_active_session`.
- **Privacy preferences — PASS by production evidence.** Persisted preference rows and successful `privacy.preferences_updated` audit events confirm the workflow has executed. Analytics/research preferences remain separate from pilot participation authorization.
- **Deletion workflow — PASS by production evidence.** Existing audit evidence includes deletion request, approval, cancellation, and completed student erasure. No additional irreversible deletion was performed merely to close Sprint 11.

Three exact-release sessions created after the original 11L baseline were also identified. They were classified as `incompatible / outside_cohort`, preserving them as QA context while excluding them from formal pilot/calibration evidence.

The live `sprint_11f_disposition_complete` gate is now **passed**.

## 11F.4 — Privacy/participation readiness boundary

**Status: ⚪ Deferred to Sprint 11.5 for human execution.**

Technical role/privacy controls are already present, but real participant authorization is an operational requirement and is not equivalent to `research_use_opt_in` or `product_analytics_opt_in`.

Before a formal real-user cohort is enrolled in Sprint 11.5:

- define who is responsible for participant/guardian authorization where required;
- document the pilot purpose and what data will be collected;
- keep the cohort intentionally small and controlled;
- avoid collecting unnecessary identity data;
- verify each teacher sees only their authorized class/student scope;
- verify suspended/deletion-pending accounts cannot continue normal learning access.

This sprint is not a legal-compliance certification.

## 11F.5 — Controlled tester cohort

**Status: ⚪ Deferred to Sprint 11.5 after Sprint 11 technical handoff closure.**

When the cohort is run, collect operational evidence without changing the learning engine mid-pilot unless a blocking defect requires intervention.

Observe:

- whether students can determine the next action without developer guidance;
- whether bounded Practice completes normally;
- whether Diagnostic and Mastery remain distinct in learner behavior;
- whether exact-repeat rates stay low enough that improvement is not primarily explained by memorising concrete variants;
- whether protected Mastery exposure behaves as designed;
- whether any item family is unexpectedly easy, hard, slow, frequently missed, or frequently abandoned;
- whether teachers can interpret the skill matrix and intervention signals correctly.

Human feedback may be collected later in this phase. It is deliberately not part of the initial technical QA gate.

## 11F.6 — Sprint 11 technical handoff closure

Sprint 11 may close after:

- the authenticated browser/device/keyboard matrix passes or each remaining issue has an explicit accepted workaround;
- the final production workflow smoke passes or each remaining workflow item has an explicit accepted disposition;
- 11G Mathematics placeholder/isolation QA and 11H remaining surface-containment QA pass or are explicitly dispositioned;
- critical technical, privacy, security, curriculum or scope defects are resolved or explicitly accepted for handoff;
- a technical handoff report records implemented capability, accepted limitations and safe tester conditions;
- the 11L pilot-governance controls remain fail-closed, with no claim that a human cohort has run.

The first closure criterion is satisfied by the executed 11F.2 rendered evidence plus the explicit four-item accepted limitation documented above. The 11F.3 criterion is satisfied by the production evidence and explicit dispositions recorded above.

Formal tester/cohort evidence, usability feedback, repetition/exposure review and the pilot/test report used for Sprint 12 calibration are Sprint 11.5 work.

## Current residuals

### Supabase Auth hardening

Supabase currently reports **Leaked Password Protection disabled**. Treat this as an open security-hardening item before broader external rollout. It does not invalidate the current Chapter I engine evidence, but it should not be silently ignored when 11F is closed.

### Database performance/policy lint

Supabase performance lint still reports optimization opportunities such as unindexed foreign keys, RLS init-plan improvements, unused indexes, and multiple permissive policies. These are not currently classified as correctness failures for the small controlled pilot. Address them selectively from observed query plans/latency rather than by broad speculative changes during 11F.

## Final disposition

Sprint 11F is complete for technical handoff readiness.

The remaining human/testing work is intentionally outside 11F:

- participant/guardian authorization where applicable;
- authorized tester/cohort enrollment;
- full real-user Diagnostic → Practice → Mastery observation;
- usability feedback and pilot evidence review.

Those items belong to Sprint 11.5.

See `docs/sprint-11-technical-handoff-report.md` for the consolidated handoff evidence.

Only curriculum-compatible, authorized cohort evidence gathered after the Sprint 11I–11K standards/versioning baseline is eligible for formal pilot review and Sprint 12 calibration in Sprint 11.5.
