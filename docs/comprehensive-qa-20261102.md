# Comprehensive QA — 2026-11-02

Asia/Yerevan · planned and executed within the current B.12.3 stabilization scope. The reviewed production baseline is `9c9204f22496f2ca0bc509a62212774e160e3d36` (PR390). John reports that the chapter correction now works and requests comprehensive QA; this is bounded confirmation of that correction, with full owner usability acceptance still separate.

## Roadmap checkpoint

- **Current:** 16.5B.12.3, cross-role usability/stabilization. B.12.2 teacher performance and the implemented workspace capabilities are delivered; recorded defects, verification gaps and final owner usability remain open.
- **Subject hold:** English is paused after C47, Unit3 provisional activation/read acceptance. Resume with Unit3 full learner/audio/writing acceptance, then Units4–6 and English closure after the workspace exit.
- **Later gates:** full four-subject 16.4/16.5C acceptance precedes Sprint17. Mathematics/Armenian availability, content/SME approval, classroom speaking and independent SEC-AAL/URL-P1/MASTER-P2 decisions are preserved. A QA pass does not activate a subject, certify specialist content or close these gates.

## Method and execution rules

Follow each implemented journey from visible UI through its API and authorized data to the rendered result. Check positive own-school access before negative probes. Classify evidence as fresh live, fresh guarded fixture, exact-source reused CI, isolated browser/SQL, historical, blocked or not implemented. A failed boundary stops that journey; independent checks continue. Do not convert failed/canceled runs into passes or retry writes after an unknown result.

Production runs use the existing main-only, exact-frontend, designated two-school fixture guards and shared `sprint-14-isolation-qa` lock. Start only one pending workflow at a time because GitHub can replace an older pending member of that group. Preserve existing deadlines, scoring/learning criteria, approvals and run-owned cleanup. The delivery runner may create synthetic QA resources, tasks and responses only under its existing fixture contract. Do not start an assessment or alter an answer, mark, credential, permission, factor or account-deletion state in the owner's ordinary student account.

Reuse the passing baseline CI on the exact source: main41484818086, 1,649 unit/integration and397 native Chromium checks, PostgreSQL17 and institutional concurrency, with all five release gates successful and no failures/skips/cancellations. New documentation remains subject to the unchanged PR/main gates. Retained evidence is not labelled a newly exercised live journey.

## Coverage and execution plan

| ID | Coverage and expected result | Evidence / execution |
| --- | --- | --- |
| Q01 | Reviewed source, canonical release, served frontend and deployed consumer identity agree; no stale bundle is accepted. | Exact production baseline/source check; existing public asset hashes; production runners recheck their full source manifests. |
| Q02 | Application/assessment contracts, malformed input, concurrency, revocation and model boundaries remain enforced. | Reuse exact-source1,649 checks, real isolated PostgreSQL17 races and institutional concurrency. |
| Q03 | Five roles preserve their priorities, navigation, account controls and permission boundaries. |397 native checks plus current guarded teacher/student/School Admin journeys. Fresh privileged walkthroughs depend on normal role credentials/MFA; earlier live evidence is identified separately. |
| Q04 | Physics I–VI discovery, legacy links, selected enrollment/release/unit, all course tabs and baseline prerequisites agree. | Fresh Chapter VI read suite, covering all six Physics chapters in both schools, with no assessment writes. Owner's live chapter confirmation is recorded separately. |
| Q05 | English Units1–3 retain separate subject/enrollment policy, guides, writing discovery and cross-programme denials. | Fresh English Unit3 read suite; it also preserves Units1/2 and the Physics context. Finite learner acceptance attempts remain under their existing bounded ledgers and the subject-resumption checkpoint. |
| Q06 | Choice/numeric/typed/arrangement responses, task sets, protected audio, hints, readiness, mastery/retry and historical reporting follow configured contracts. | Exact-source unit/native/SQL coverage plus curriculum read policy/protected-source checks. This does not claim new complete learner attempts or semantic content validation. |
| Q07 | Teacher optional publication and assignment remain distinct; class/selected recipients, previews, duplicate-send protection, cancellation and exact PDF bytes work. | Fresh full resource-assignment production runner, two dedicated schools, pre/post54-control isolation and owned cleanup. |
| Q08 | Published writing/custom text/link/PDF tasks preserve draft/source privacy, required response format, student submission, teacher rubric/feedback, returned revision and durable receipts. | Fresh nested suites verify authoring/delivery/receipt/cancellation and read-only learner forms. Save/submit/grade/revision transitions use current isolated browser and actual-SQL/Edge coverage; no fresh live learner submission/grade is claimed. |
| Q09 | Existing reviewed work/feedback, My Work routing, archive/search and account return remain coherent across roles. | Nested B.12.3 usability reads and teacher-feedback production read suite where not already covered by the delivery result. |
| Q10 | School oversight, class/history filters, teacher/learner aggregates and cross-school denials remain correctly scoped. | Guarded own-school positive/negative controls, native admin/class/history tests; distinguish current live from earlier Master Admin read evidence. |
| Q11 | Logout, lost submission/feedback replies, stale responses, duplicate initialization and revoked account/context access recover without losing private work or submitting twice. | Exact-source native lifecycle/failure fixtures and real SQL/Edge integration contracts; ordinary live checks stay read-only. |
| Q12 | Narrow/desktop layouts, Armenian whole words, 200% text, focus/keyboard, status meaning and reduced motion remain usable. |397 native checks and retained exact-source captures; fresh mobile smoke if its credentials/guards are valid. Chromium emulation is not physical-device, Safari/Firefox or full WCAG certification. |
| Q13 | Teacher useful-Home, class opening and loaded navigation meet the existing measured profile/budgets. | Existing verified150-observation baseline; fresh guarded performance run where available, without changing its budgets or dependency guards. |
| Q14 | Private files, API/direct-table access, role/tenant isolation, session cleanup and configuration advisories are assessed. | Fresh read-only Supabase advisors/log correlation, complete64-function/264-file-instance source readback, protected read suites and new run cleanup receipts. Independent security findings remain open until their own disposition. |
| Q15 | All45 capability IDs retain explicit implementation/dependency status; roadmap summaries match delivered code. | Audit the full matrix; reconcile obsolete summaries without enabling pending features. Planned year rollover, transfer, notifications, interventions and AI are not counted as working features. |
| Q16 | Unexercised destructive, privileged, device and operational paths are explicit. | No production credential/factor/permission changes, real account erasure, backup restore or load test. Those require isolated/designated procedures and their owning approval/acceptance gates. |

## Initial risks and findings

- UX-STUDENT-ACCESS-01: a prior live chapter-access failure recovered on reload; same-window gateway401 and automatic English read41480624659 (51/54 isolation) remain failed/open. Investigate request-level evidence; do not diagnose a token or SDK cause from a warning alone.
- QA-TRANSPORT-01: historical no-response failures remain distinct from current HTTP401 observations; do not merge their causes.
- Documentation drift: the roadmap overview still describes16.5 implementation/design approval as pending, while its detailed section and authoritative status record delivery. The capability matrix's dated B.8.2 note and S37 subset also predate custom-task production integration. Reconcile these current summaries while preserving all45 IDs and future dependency gates.
- Fresh advisor results include disabled leaked-password protection and database performance notices. These are configuration observations, not proof of exploitability or a diagnosis of the401s. Record the exact scope/remediation references; make no settings changes during this QA.

## Results

**QA execution is complete with open findings. B.12.3/B.12 remain open; subjects stay paused.** The three fresh functional/read suites pass. Fresh performance verification fails and is preserved as failed. The [receipt](evidence/comprehensive-qa-20261102.json) records scope, artifact hashes, cleanup and limitations.

| Check | Outcome | Evidence type |
| --- | --- | --- |
| Required CI41484818086 | All five gates pass:1,649 unit/integration,397 native, PostgreSQL17 and institutional concurrency; zero failures/skips/cancellations. | Exact-source reused CI, independently verified on the current application source. |
| [Delivery41489134618](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41489134618) |327/327 plus54/54 before and54/54 after;49 public frontend files match. | Fresh actual teacher/student/School Admin pages/APIs in two dedicated schools; no learner submission/grade. |
| [Physics41489665548](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41489665548) |324/324 plus54/54 isolation; all six chapters; both browser diagnostics have zero errors/blocked mutations. | Fresh read-only curriculum/tenant/role/protected-source checks; no learner attempts. |
| [English41491629527](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41491629527) |154/154 plus54/54 isolation; Units1–3 and preserved Physics scope. | Fresh read-only programme, guides, writing discovery and mixed/foreign scope checks. |
| [Performance41492523110](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41492523110) | **Failed** at `B:5:unit-switch`;120/150 observations saved. Complete summary/p95 verdict was not produced. Both own sessions close successfully. | Fresh read-only standard desktop/CDP4G profile; unchanged budgets and45-second browser timeout. |
| [All deployed Edge bundles](evidence/comprehensive-qa-edge-parity-20261102.json) |64/64 functions read;264 file instances from112 repository source files.257 are byte-exact;7 differ only in a trailing newline. No executable-source mismatch. | Fresh management readback; explicit packaging mappings and all byte differences recorded. No runtime/configuration writes. |

Delivery cleanup cancels all owned resource/writing/custom-task assignments and withdraws the two generated library resources. Six main delivery sessions plus its two sets of isolation sessions close withHTTP204; curriculum suites also record their own and isolation-session cleanup. Private teacher drafts, pinned source PDFs and immutable audit remain under the normal retention contract. Earlier learner/assessment state is preserved. Three current synthetic screenshots were freshly inspected: teacher custom-task receipt, the390px student response form and PDF-first publication. No page/control clipping was observed in those captures; this is bounded visual inspection, not a new whole-product usability decision.

### Prioritized dispositions

1. **QA-PERF-01, P2 — teacher unit-switch/current performance verification open.** School A completed all10 iterations; school B completed five and stopped during its sixth unit switch. Same-window gateway logs record `get-teacher-dashboard` HTTP503 at17:43:51.204UTC, request `01a19d5c-07a3-7f01-b7b6-fd270c5a8e9f`,14,593ms execution. The runner loses the failing operation's detailed request/DOM evidence when the wait throws, so exact browser/request correlation and the failed assertion remain unconfirmed. All120 observations, request timings and profile data are preserved in the [full redacted report](evidence/comprehensive-qa-performance-20261102.json); the failed run remains failed. Capture a safe failure diagnostic, identify the503 path and recheck the unchanged profile after correction; do not increase deadlines/budgets to produce a pass. Earlier B.12.2 delivery remains historical and does not satisfy this fresh failed run.
2. **UX-STUDENT-ACCESS-01, P2 — intermittent401 cause open.** All four prior401s have Edge execution IDs, ES256/session-claim metadata and a gateway user entry. Three prior QA provider request IDs match exactly; the browser observation has no matching captured request ID. The same window contains38 Auth `GET /` completions withHTTP200, without nested verification correlation. This establishes neither token expiry, a malformed token, JWKS failure nor a provider outage. Fresh positive runs do not relabel the earlier failures. Add safe verification error categories/nested provider correlation before selecting a fix; retain all session/authorization gates.
3. **QA-EVIDENCE-01, P2 — authenticated mobile evidence needs review.** `playwright.config.js` retains failure traces/video; authentication fills real configured QA credentials and the workflow uploads `test-results`. Playwright's [network trace](https://playwright.dev/docs/trace-viewer#network) exposes request/response headers and bodies. That creates a potential sensitive-evidence path; no actual leak is asserted or newly generated here. This legacy workflow was not run in this pass. Disable/redact credential-bearing auth recording and add explicit source/designated-identity guards before using it.397 isolated native checks and fresh390px fixture imagery remain valid, separate coverage.
4. **Configuration/advisor review.** Fresh Supabase notices include disabled [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), RLS-without-policy INFO and five performance notice groups (unindexed FKs, RLS init plans, missing primary key, unused indexes, multiple permissive policies). Review actual affected objects before choosing changes; deny-only/service-managed tables and unused-index notices are not automatically vulnerabilities. No setting/index/policy/plan was changed and these notices do not establish the401/503 cause.
5. **DOC-QA-01, P3 — corrected.** Current16.5 overview now records delivered design/workspaces and open B.12.3; the old B.8.2 matrix note is historical and S37's current delivered subset is explicit. All45 stable IDs and pending dependencies remain.

### Remaining acceptance and coverage limits

- Save/submit/grade/returned-revision state transitions have current isolated actual-SQL/Edge/browser evidence. Fresh production checks exercise authoring, delivery, receipt, read-only forms, cancellation and schoolA's pre-existing reviewed feedback; schoolB has no existing reviewed writing response. No fresh production learner submission/grade was manufactured. A complete current live learner round trip remains a separate bounded fixture exercise.
- Three institutional roles have current guarded production journeys. Master Admin and Content Reviewer have isolated current UI/contract coverage and earlier normal sign-in/MFA read receipts; those privileged ordinary-account walkthroughs were not freshly repeated.
- Physical devices, Safari/Firefox and full WCAG certification, real credential/factor changes, real account erasure, live backup restore and load testing were not performed. Future/proposal capabilities remain dependency-gated and are not counted as implemented-feature passes.
- John confirms that the chapter fix works. Full five-role usability acceptance and the independent security/URL/Master, specialist-content, EnglishC47 and four-subject gates remain separate.

I recommend resolving the teacher503/unit-switch failure and safely diagnosing the401s before closing B.12.3. Then complete the remaining bounded live/privileged/browser checks and obtain John's explicit usability decision. Subject work resumes at English Unit3 full learner/audio/writing acceptance, followed by Units4–6 and English closure; full four-subject16.4/16.5C acceptance still precedes Sprint17.


## Complete capability trace

Availability is retained from the45-entry source matrix; implementation and pending dependencies are not merged into one pass count.

| ID | Capability | QA areas | Scope |
| --- | --- | --- | --- |
| S01 | Sign in, student registration, sign out | Q03, Q11, Q14 | Implemented or partial; use evidence-specific outcomes above |
| S02 | Email/password change and recovery | Q11, Q16 | Implemented or partial; use evidence-specific outcomes above |
| S03 | Invitation acceptance / join by code | Q02, Q03 | Implemented or partial; use evidence-specific outcomes above |
| S04 | Authorized course discovery | Q04, Q05 | Implemented or partial; use evidence-specific outcomes above |
| S05 | Selected school/class/year/release | Q04, Q05, Q15 | Implemented or partial; use evidence-specific outcomes above |
| S06 | Unit/topic/skill navigation | Q04, Q05 | Implemented or partial; use evidence-specific outcomes above |
| S07 | Resume active session | Q04, Q06 | Implemented or partial; use evidence-specific outcomes above |
| S08 | Recommended next action | Q04, Q06 | Implemented or partial; use evidence-specific outcomes above |
| S09 | Baseline diagnostic | Q02, Q04, Q06 | Implemented or partial; use evidence-specific outcomes above |
| S10 | Adaptive practice | Q02, Q06 | Implemented or partial; use evidence-specific outcomes above |
| S11 | Chapter/unit review | Q02, Q06 | Implemented or partial; use evidence-specific outcomes above |
| S12 | Mastery / retry capacity | Q02, Q06 | Implemented or partial; use evidence-specific outcomes above |
| S13 | Single choice / numeric / typed answers | Q02, Q06 | Implemented or partial; use evidence-specific outcomes above |
| S14 | Matching / categorisation / ordering | Q02, Q06 | Implemented or partial; use evidence-specific outcomes above |
| S15 | Shared reading and listening task sets | Q05, Q06 | Implemented or partial; use evidence-specific outcomes above |
| S16 | Audio delivery / replay / technical exit | Q05, Q06, Q14 | Implemented or partial; use evidence-specific outcomes above |
| S17 | Hints / worked examples / guides | Q04, Q05, Q06 | Implemented or partial; use evidence-specific outcomes above |
| S18 | Writing task discovery | Q05, Q08, Q09 | Implemented or partial; use evidence-specific outcomes above |
| S19 | Writing draft save / submission | Q08, Q11 | Implemented or partial; use evidence-specific outcomes above |
| S20 | Teacher feedback / returned revision | Q08, Q09, Q11 | Implemented or partial; use evidence-specific outcomes above |
| S21 | Progress / readiness by skill | Q02, Q04, Q05 | Implemented or partial; use evidence-specific outcomes above |
| S22 | Assessment and session history | Q02, Q04, Q05 | Implemented or partial; use evidence-specific outcomes above |
| S23 | Speaking / practical evidence | Q06, Q15 | Implemented or partial; use evidence-specific outcomes above |
| S24 | Privacy preferences and data inventory | Q03, Q11, Q14 | Implemented or partial; use evidence-specific outcomes above |
| S25 | Deletion request / cancellation | Q11, Q16 | Implemented or partial; use evidence-specific outcomes above |
| S26 | Suspended / deactivated / revoked access | Q02, Q11, Q14 | Implemented or partial; use evidence-specific outcomes above |
| S27 | Existing deep links / role surfaces | Q03, Q04, Q11 | Implemented or partial; use evidence-specific outcomes above |
| S28 | New account / no enrollment | Q03, Q11 | Implemented or partial; use evidence-specific outcomes above |
| S29 | Loading / partial / service error | Q03, Q11, Q14 | Implemented or partial; use evidence-specific outcomes above |
| S30 | Mobile / keyboard / reduced motion | Q03, Q12 | Implemented or partial; use evidence-specific outcomes above |
| S31 | Current placement / automatic progression | Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S32 | Subject delivery pending | Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S33 | Previous years / read-only history | Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S34 | Account recovery without old email | Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S35 | School transfer continuity | Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S36 | Longitudinal learner profile | Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S37 | Notifications / teacher assignments | Q07, Q08, Q09, Q15 | Implemented or partial; use evidence-specific outcomes above |
| S38 | Teacher assessments / intervention / reassessment | Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S39 | Accommodations | Q02, Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S40 | Learning-growth / confidence / portability | Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S41 | Controlled AI feedback / help | Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S42 | Future subjects / grades / response types | Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S43 | Localization / help / disputes | Q03, Q12, Q15 | Implemented or partial; use evidence-specific outcomes above |
| S44 | Engagement preferences / optional goals/avatar | Q15 | Dependency/proposal gate; not an implemented-feature pass |
| S45 | Supplementary subject materials | Q07, Q14 | Implemented or partial; use evidence-specific outcomes above |
