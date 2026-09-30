# Armenian Curriculum Mastery Platform — Sprint Roadmap

**Roadmap version:** 2.57
**Updated:** 2026-09-30
**Current programme status:** Sprints 11, 11.5, 12 and 12.5 are ✅ complete. Sprint 13 is closed for sprint sequencing by product-owner direction; the external Physics SME production release gate remains unresolved and the Chapter I release stays pilot. Sprint 14 is 🟡 in progress: 14A is deployed; 14B account/provisioning/recovery controls, the authenticated school-admin operational overview and the teacher workspace operations are deployed; and the 14C school-scoped learner onboarding, exact-context stamping, assigned-class teacher roster and teacher evidence views are deployed. Institutional teachers can create assigned classrooms, send bounded bulk email invitations, issue optional one-use join codes, separate active and archived classrooms, and rename authorized classrooms without changing their identity or evidence. Role-scoped privacy inventories and Armenian-safe responsive layouts are deployed across role dashboards. Teacher offboarding and database-enforced final school-administrator guards are deployed. Authenticated two-school read isolation passed 54/54 live checks on 2026-09-28. Authenticated action acceptance also passed 141/141 checks across both schools, with 54/54 read-isolation checks before and after. Teacher navigation/rename/archive, reciprocal class/staff mutation denials and temporary-membership offboarding UI acceptance are complete for these fixtures. Live multi-unit/multi-context switching remains open once a second authorized release exists. School-wide administrative analytics remain a separate 14D gate. The formal Grade 7 MVP is a four-subject gate: Physics, Mathematics, Armenian Language and English.

This file is the canonical high-level sprint sequence. `docs/backlog.md` remains the detailed implementation checklist, and sprint-specific documents contain execution evidence and acceptance notes.

## Subject-Neutral Core and Subject-Aware Extension Invariant — 2026-09-30

**Status: ✅ Adopted as a core project requirement.** The platform core must be subject-neutral; subject-specific behavior must use explicit, versioned configuration or extension points. The invariant now governs project policy, architecture decisions and future acceptance gates. Its canonical requirements and ten acceptance criteria are in `docs/subject-neutral-core.md`.

Adoption establishes the rule for all new work and creates a bounded migration obligation for existing subject-coupled behavior. It does not certify that every historical Physics-first implementation is already compliant. A four-subject integration gate must demonstrate that Physics, Mathematics, Armenian Language and English coexist without subject leakage or redesign of shared platform capabilities before the Grade 7 MVP is declared complete.

## Sprint 15A authoring-tool decision — 2026-09-29

By product-owner approval, Sprint 15 begins with **15A — Content and Hint Authoring Tools**. It is a mandatory entry slice before bulk hint production or publication for Physics 7 Chapters II–VI. Curriculum/source mapping may proceed in parallel, but scaling the hint bank must wait until the governed reviewer workflow passes its acceptance gate. The editor is deterministic content-governance infrastructure; live AI hint generation and teacher editing remain outside this slice.

## Bounded code-review maintenance — 2026-09-28

Three immediate review actions are implemented as one bounded slice: CI parity for mirrored core modules with import-extension normalization, DOM-safe MFA factor rendering, and README correction for the live session-bound learning loop and retired HTTP-410 endpoint. [Implementation and verification record](qa-review-three-actions.md). This checkpoint does not close Sprint 14 or change authorization, curriculum/release gates, learning criteria or the remaining institutional acceptance scope. Hosted CI and delivery status are recorded with the implementation PR and Notion checkpoint.

## ChatGPT execution-mode routing

This roadmap also governs how ChatGPT should be used for each sprint. The mode is a default routing rule, not a substitute for judgment about a specific task.

### Mode definitions

- **Regular chat** — architecture, curriculum/standards reasoning, policy and governance decisions, metric definitions, acceptance criteria, evidence interpretation, disposition decisions and implementation planning.
- **Work mode** — multi-step execution across GitHub, Supabase, Vercel, Notion and browser QA; code changes; migrations; deployment; repetitive cross-role/cross-browser checks; evidence collection and synchronization.
- **Hybrid** — define and approve the slice in regular chat first, execute it in Work mode, then return to regular chat to audit evidence and decide the next slice.

### Routing invariant

1. Before substantial work starts, classify the requested slice as **Regular chat**, **Work mode**, or **Hybrid**.
2. A broad request such as "continue Sprint 14" must **not** be sent directly into open-ended Work mode. First define the next bounded slice, invariants, acceptance criteria and exclusions in regular chat unless those are already explicit in the roadmap/implementation plan.
3. Once a slice is execution-ready, use Work mode for repository/database/deployment/browser work rather than manually coordinating many implementation calls in regular chat.
4. After Work mode completes a material slice, review the evidence in regular chat before expanding scope or declaring the sprint complete.
5. Human authorization, curriculum interpretation, SME judgment, privacy-policy decisions and acceptance/disposition decisions are never delegated to Work mode as autonomous product decisions.
6. QA-only or implementation-only residuals should be treated as closure punch-list work, not as invitations to redesign the architecture unless testing reveals a genuine architectural defect.

### Default mode by sprint

| Sprint | Default mode | Routing rule |
|---|---|---|
| 0 | Work | Repository, Supabase, RLS, CI/CD and deployment execution. |
| 1 | Hybrid | Curriculum architecture in chat; structured implementation in Work. |
| 2 | Work | End-to-end vertical-slice implementation and verification. |
| 3 | Hybrid | Diagnostic/session rules in chat; implementation and regression in Work. |
| 4 | Work | Dashboard, queries, UI and integration testing. |
| 5 | Hybrid | Adaptive-learning rules in chat; code and regression in Work. |
| 6 | Hybrid | Mastery semantics in chat; protected workflow implementation in Work. |
| 7 | Work | Teacher-dashboard implementation and multi-surface verification. |
| 8 | Hybrid | QA/content-governance framework in chat; workflow implementation in Work. |
| 9 | Work | Browser/device/accessibility/localization QA and fixes. |
| 10 | Hybrid | Privacy/security policy in chat; RLS/auth/admin/deletion implementation in Work. |
| 10.5 | Work | Front-end implementation and cross-device/browser verification. |
| 11 | Hybrid | Governance/standards/evidence decisions in chat; residual QA, migrations and technical execution in Work. |
| 11.5 | Hybrid | Tester/pilot authorization and evidence rules in chat; cohort setup, operational QA and evidence collection in Work. |
| 12 | Hybrid | Calibration interpretation and decision rules in chat; data extraction/implementation in Work. |
| 12.5 | Hybrid | Academic policy and attention-model definitions in chat; state machine, data model, APIs, UI, analytics and QA in Work. |
| 13 | Work | Release checklist, deployment, migrations, regression and evidence reconciliation. |
| 14 | Hybrid | Multi-tenant academic architecture first in chat; bounded implementation slices in Work. |
| 15 | Hybrid | Content-governance and curriculum design in chat; reviewer editor, bulk ingestion and technical QA in Work. |
| 16 | Work | Physics reference-course integration and regression. |
| 16.1 | Hybrid | Mathematics curriculum/evidence design in chat; vertical-slice implementation and QA in Work. |
| 16.2 | Hybrid | Armenian-language curriculum/evidence design in chat; vertical-slice implementation and QA in Work. |
| 16.3 | Hybrid | English curriculum/evidence design in chat; vertical-slice implementation and QA in Work. |
| 16.4 | Work | Four-subject Grade 7 integration, regression and MVP-readiness verification. |
| 17 | Hybrid | Four-subject pilot design and interpretation in chat; operational setup/QA/evidence handling in Work. |
| 18 | Work | Performance, observability, backups, CI/CD, security, data-integrity and curriculum-change operations. |
| 18.5 | Hybrid | Academic-year lifecycle/rollover rules in chat; lifecycle, handover and rollover implementation in Work. |
| 19 | Work | Institutional beta release, onboarding, support and operational verification. |
| 20 | Hybrid | Grade-specific curriculum modelling in chat; bulk implementation/QA in Work. |
| 21 | Hybrid | Post-MVP subject/grade selection and disciplinary modelling in chat; generalized implementation in Work. |
| 22 | Work | Repeated standards-driven subject onboarding once the framework is stable. |
| 23 | Hybrid | Longitudinal data model in chat; cross-grade/cross-subject implementation in Work. |
| 24 | Hybrid | Metric definitions, confidence/explainability and interpretation in chat; analytics queries/dashboards in Work. |
| 24.5 | Hybrid | Teacher intervention/assessment/remediation policy in chat; workflow implementation in Work. |
| 25 | Hybrid | AI boundaries/evaluation in chat; integrations, tests and telemetry in Work. |
| 26 | Hybrid | National-scale governance/architecture in chat; scale/security implementation in Work. |

### Sprint 11 current routing

For the current Sprint 11 state:
- remaining **11F–11H** QA/disposition execution defaults to **Work mode** using the frozen closure punch-list;
- **Sprint 11 closes at technical handoff readiness**, not at completion of a human cohort;
- the existing 11L pilot authorization/cohort gates remain fail-closed and are carried forward intact into **Sprint 11.5**;
- informal/external testing may begin only within the permissions and safeguards available for that tester, but such evidence does not count as formal pilot/calibration evidence unless the Sprint 11.5 authorization gates are satisfied;
- final Sprint 11 technical evidence review happens in **regular chat** before declaring handoff readiness.

## Status legend

- ✅ Complete
- 🟡 In progress
- ⏳ Planned / pending
- ⚪ Explicitly deferred or accepted limitation

## Roadmap

| Sprint | Name | Status | Current disposition |
|---|---|---:|---|
| 0 | Technical Foundation | ✅ | Core repository, Supabase, deterministic grading, RLS and initial deployment foundation established. |
| 1 | Grade 7 Physics Curriculum Architecture | ✅ | Chapter I curriculum architecture completed; external Physics SME validation remains explicitly provisional where noted. |
| 2 | First Vertical Learning Slice | ✅ | First authenticated learner loop implemented. |
| 3 | Diagnostic + Bounded Learning Sessions | ✅ | Diagnostic and bounded session model implemented. |
| 4 | Diagnostic Results & Student Dashboard | ✅ | Diagnostic evidence and student-facing dashboard implemented. |
| 5 | Adaptive Practice v2 | ✅ | Adaptive practice, remediation and bounded-session behavior implemented. |
| 6 | Mastery Checks | ✅ | Protected Mastery Check workflow implemented. |
| 7 | Teacher Dashboard v1 | ✅ | Class, student, skill-matrix and intervention views implemented. |
| 8 | Content & Assessment Quality System | ✅ | Content review, QA and lifecycle controls implemented. |
| 9 | UX, Accessibility & Armenian Localization QA | ✅ | Armenian-first UX, accessibility and responsive hardening completed at source/QA level. |
| 10 | Security, Privacy & Administration | ✅ | Role, status, privacy, deletion and administration controls implemented. |
| 10.5 | Student Experience & Front-End Redesign | ✅ | Front-end redesign completed; deferred live browser matrix was later dispositioned in 11F.2. |
| 11 | Assessment Integrity, Standards Integrity & Technical Handoff Readiness | ✅ | Technical handoff complete. 11F–11H are passed/dispositioned; the carried-forward 11L entry gates are now satisfied by the prospective Sprint 11.5 pilot. |
| 11.5 | Controlled External Tester Pilot | ✅ | Closed one-adult feasibility run: eight eligible prospective sessions, smooth experience, no substantive content defects, historical Diagnostic excluded, and all closure gates passed. |
| 12 | Learning-Model Calibration | ✅ | 12A.1–12A.5 complete; 12B reviewed the feasibility evidence and recorded an immutable deferred/no-change disposition. No learning parameter changed. |
| 12.5 | Universal Chapter Review & Mastery-Retry Lifecycle | ✅ | Complete. 12.5A–Z, lifecycle branches, persisted MCQ randomization, authenticated desktop QA and authenticated mobile learner/teacher QA at 390 px and 430 px all pass. Production Mobile browser QA #2 passed on GitHub head `0c56fa8`. |
| 13 | Chapter I Standards-Verified Production Release | ✅ sequencing closure; release gate open | Product owner directed Sprint 14 to proceed. External Physics SME approval is still pending and the Chapter I release remains pilot, not standards-verified production. |
| 14 | Multi-Tenant, Multi-Grade / Multi-Subject Academic Architecture | 🟡 | 14A deployed. 14B account/provisioning/recovery controls, school-admin operations and teacher workspace operations are deployed. Institutional classroom creation, class-bound bulk invitations, optional secure join codes, dedicated active/archive views, and authorized classroom renaming are complete. The 14C school-scoped learner onboarding, exact-context session stamping and teacher roster/evidence views pass their current controlled production checks. Teacher offboarding and final school-administrator guards are deployed. Authenticated two-school read isolation passed 54/54 checks. Authenticated class/staff mutation-denial and teacher navigation/rename/offboarding action acceptance passed 141/141 checks, with read isolation passing 54/54 before and after. Multi-context switching remains open after a second authorized release; school-wide analytics remains the separate 14D gate. |
| 15 | Grade 7 Physics Expansion — Chapters II–VI | ⏳ | Begin with mandatory 15A Content and Hint Authoring Tools, then build remaining Physics 7 units through standards → outcomes → skills → assessment → QA. |
| 16 | Physics 7 Reference Course Integration | ⏳ | Integrate the complete Physics 7 reference course and preserve unit-bound diagnostics/mastery with course-level aggregation. |
| 16.1 | Mathematics 7 MVP Vertical Slice | ⏳ | Build one production-ready, official-programme-derived Mathematics 7 unit through the complete learner, teacher, governance and QA pipeline. |
| 16.2 | Armenian Language 7 MVP Vertical Slice | ⏳ | Build one production-ready, official-programme-derived Armenian Language 7 unit through the complete learner, teacher, governance and QA pipeline. |
| 16.3 | English 7 MVP Vertical Slice | ⏳ | Build one production-ready, official-programme-derived English 7 unit through the complete learner, teacher, governance and QA pipeline. |
| 16.4 | Grade 7 Four-Subject MVP Integration | ⏳ | Integrate Physics, Mathematics, Armenian Language and English; verify subject isolation, shared workflows, analytics, assignments, tenant controls and release provenance. |
| 17 | Grade 7 Four-Subject School MVP Pilot | ⏳ | Run the formal school-level MVP pilot only after all four subject gates pass; technical QA may continue earlier. |
| 18 | Production Hardening & Curriculum-Change Operations | ⏳ | Address scale, performance, security, observability, incident response, backup/restore, data-integrity checks, controlled rollout and safe curriculum-version migration/rollback. |
| 18.5 | Academic-Year Lifecycle, Rollover & Continuity | ⏳ | Implement the operational academic-year lifecycle: prepare/activate/close/archive, student progression, teacher/class handover, validated rollover and historical preservation. |
| 19 | Public / Institutional Beta | ⏳ | Controlled external beta with repeatable school onboarding, support/escalation, tenant-isolated administration, controlled enrollment and explicit curriculum-release identity. |
| 20 | Physics Grade Expansion — Physics 8–12 | ⏳ | Expand Physics vertically by mapping each grade to its applicable current programme rather than copying Physics 7 upward. |
| 21 | Post-MVP Subject / Grade Expansion | ⏳ | Onboard the next priority subject/grade combination using the four-subject Grade 7 evidence model and verify repeatability beyond the MVP bundle. |
| 22 | Multi-Subject Expansion Across Grades | ⏳ | Apply a repeatable standards-driven subject-onboarding pipeline across multiple subjects and valid grade combinations. |
| 23 | Cross-Grade / Cross-Subject Learner Profile | ⏳ | Build longitudinal, curriculum-version-aware learner state that survives grade/school changes and can support cross-grade/cross-subject prerequisites. |
| 24 | Advanced Teacher, School & Curriculum Analytics | ⏳ | Add evidence-confidence-aware instructional, cohort, school, curriculum-implementation, growth, engagement, question-quality and explainable analytics. |
| 24.5 | Teacher Assessment, Intervention & Remediation Workflows | ⏳ | Turn trusted analytics into teacher-controlled assessments, interventions, reassessment/retention queues, notifications and targeted remediation/homework. |
| 25 | Controlled AI Layer | ⏳ | Introduce provider-independent, bounded AI assistance while keeping official curriculum identity, grading, mastery evidence, permissions and progress deterministic/auditable. |
| 26 | National-Scale Readiness | ⏳ | Prepare multi-school governance, large-scale operations, curriculum-update governance, regional/national administration, security and support for national deployment. |

## Current sprint — Sprint 11

### 11A — Item-bank architecture and exposure model

**Status: ✅ Complete.**

### 11B — Repetition and selection policy

**Status: ✅ Complete.**

### 11C — Parameterised and parallel item variants

**Status: ✅ Complete.**

### 11D — Grade 7 Physics Chapter I bank expansion and content QA

**Status: ✅ Complete.** Production bank: 240 active pilot-eligible variants across 10 skills, with 120 Practice, 40 Diagnostic and 80 protected Mastery variants.

### 11E — Pilot analytics and item-quality evidence

**Status: ✅ Complete.** Operational evidence and assessment-integrity analytics are live; these metrics are pilot evidence, not validated psychometrics.

### 11F — Closed Grade 7 Physics Chapter I pilot readiness and production workflow

**Status: ✅ Complete for technical handoff.**

11F now represents the technical/production readiness portion of the pilot. The real-cohort closure gate is moved to 11L so that the final cohort runs against a standards-reconciled curriculum baseline.

| Phase | Status | Evidence / next step |
|---|---:|---|
| 11F.1 Technical preflight | ✅ | Automated/source, database, active-bank, security/RLS and session-collision preflight completed. |
| 11F.2 Authenticated rendered production smoke | ✅ | Student and teacher authenticated production rendering passed where executable. Four authenticated browser-control repetitions were explicitly accepted as limitations, not PASS results. |
| 11F.3 Final production workflow smoke | ✅ | Teacher evidence, suspension/session revocation, privacy and deletion behavior are closed by live production/database evidence; Mastery full lifecycle is explicitly deferred rather than forced. |
| 11F.4 Privacy/participation readiness boundary | ⚪ | Human participation authorization is explicitly deferred to Sprint 11.5; Sprint 11 preserves the fail-closed pilot controls. |
| 11F.5 Technical handoff report | ✅ | Consolidated report: `docs/sprint-11-technical-handoff-report.md`. |

Recent 11F.3 production work also surfaced and corrected course-entitlement, class-join verification, course-loading and authentication-state-flash defects. Teacher-side rendering of generated Diagnostic evidence has been manually verified. On 2026-09-18 the stale second Diagnostic was preserved and marked abandoned with an explicit QA disposition; Home and Progress retained the valid 13/20 result, Physics routing passed, and Mastery correctly remained closed for five unfinished skills. The remaining 11F residuals were closed on 2026-09-20 from live production/database evidence plus explicit accepted dispositions. Human cohort execution is not an 11F closure requirement; it is Sprint 11.5 work.

### 11G — Multi-Subject Learner Shell Architecture Spike

**Status: ✅ Complete for technical handoff; Mathematics isolation accepted with an explicit current-render tooling limitation.**

Sprint 11G was inserted before Sprint 12 because the global learner Home and navigation still structurally assumed one subject. Continuing with that assumption would make later multi-subject expansion unnecessarily expensive.

Implemented:

- global Home now has a cross-subject information hierarchy rather than exposing a full Physics-only dashboard as the primary learner Home;
- learner navigation is generated from actual active class/course entitlements;
- subject cards are grouped by `courseKey` (`subject + grade`);
- Physics 7 keeps its existing subject-specific course, assessment and progress routes;
- a generic entitled-course workspace exists for subjects whose learning module is not yet implemented;
- a draft Grade 7 Mathematics QA fixture and class were added solely to create a real two-subject learner state;
- `bestenglishac@gmail.com` has active Grade 7 Physics and Grade 7 Mathematics QA memberships for this architecture test;
- regression tests pass and Vercel deployment reports success.

Rendered evidence:

- user-provided authenticated production screenshots on 2026-09-17 confirm that the global Home renders both `Մաթեմատիկա 7` and `Ֆիզիկա 7` simultaneously and presents a cross-subject Home rather than the old full Physics-only dashboard.

Additional rendered evidence:

- on 2026-09-18 an authenticated Physics learner opened the Physics 7 course normally from the new shell.

Final disposition: live two-subject entitlement state plus source-level route/API isolation proves that Mathematics uses the generic workspace and does not invoke Physics evidence APIs. A fresh authenticated Mathematics render could not be rerun because the saved browser session was unavailable; this is recorded as an accepted tooling limitation, not a fresh rendered PASS.

See `docs/sprint-11g-multi-subject-learner-shell.md` for the detailed contract and evidence.

### 11H — Platform-wide Front-End Containment & Layout Polish

**Status: ✅ Complete for technical handoff with explicit authenticated-render limitations.**

Sprint 11H was added after the first authenticated two-subject screenshots exposed visual containment defects: Armenian labels touching or crossing button borders, insufficient internal card spacing, and flex/grid children capable of forcing content outside component boundaries.

Implemented:

- shared controls now enforce `min-width: 0`, `max-width: 100%`, wrapping and bounded line-height;
- button-like links have consistent internal padding;
- shared cards, headers, rows and their direct children use explicit width containment;
- top/header/action rows can wrap instead of overflowing;
- multi-subject next-action, subject, empty-state and generic-course cards now have explicit internal padding;
- subject-card statistics, metadata and CTA controls are responsive and contained;
- multi-subject cards collapse safely on narrow screens;
- legacy Home invalid radius token was corrected;
- assessment/mastery surfaces received the same containment treatment;
- the learner-facing distinction among course/practice, progress/evidence and assessment was clarified;
- diagnostics and mastery checks are now explicitly defined as unit-bound, while course progress aggregates unit evidence;
- regression coverage was added for containment and assessment-scope semantics.

Rendered evidence:

- on 2026-09-18 the authenticated single-subject learner Home, Physics workspace and Progress view showed no observed containment regression at a 1350 × 926 desktop viewport.

Final disposition: shared containment rules remain verified in source; prior authenticated learner/two-subject evidence is retained; fresh production rendering on 2026-09-20 found no containment defects on teacher/admin/content entry surfaces. Fresh authenticated Mathematics/internal staff reruns were unavailable because no reusable authenticated browser session remained and are recorded as tooling limitations, not fresh rendered PASSes.

See `docs/sprint-11h-frontend-containment-polish.md` and `docs/assessment-scope-model.md`.

### 11I — National Standards Baseline & Source Registry

**Status: ✅ Complete.**

Sprint 11I now provides a database-backed standards registry and subject-programme applicability matrix.

Implemented:

- registered the current national framework: N 439-Ն as amended by N 699-Ն, current revision effective 22 May 2026;
- registered the current Physics subject standard: N 42-Ն with its appendix replaced by N 37-Ն, effective 14 August 2026;
- registered the current Physics programme source: N 40-Ն as amended and reissued by N 36-Ն, effective 14 August 2026;
- stored base legal identifiers separately from amendment identifiers;
- added authorities, source class/type, subject/grade applicability, official URLs, dates, verification/revision state and supersession support;
- bound Physics 7 to a complete national framework → Physics standard → Grade 7 programme chain;
- classified the Sprint 11G Mathematics 7 navigation fixture as `fixture_exempt`, with no standards-alignment claim;
- added RLS, admin/content-admin write boundaries, integrity constraints and foreign-key indexes;
- documented an event-driven and per-term source-review procedure.

Post-migration verification found zero unbound subject programmes. Supabase advisor checks report no security or actionable performance finding on the new registry tables; newly created indexes appear only in the expected unused-index informational list.

Exit criterion satisfied: every current subject-programme row resolves either to a complete governing source set or to an explicit non-curriculum fixture exemption.

See `docs/sprint-11i-standards-source-registry.md`.

### 11J — Physics 7 Current-Standard Reconciliation

**Status: ✅ Complete.**

The current ARLIS programme appendix was extracted and verified, resolving the prior official-outcome blocker.

Implemented:

- stored the six current Grade 7 Physics Theme 1 outcomes verbatim: five mandatory and one additional;
- recorded the framework and Physics-standard context for every official outcome;
- reconciled all 10 existing Chapter I micro-skills without changing stable skill IDs;
- classified direct versus justified derived-supporting mappings explicitly;
- recorded a disposition for all 77 registered item families;
- recomputed the active Practice, Diagnostic and protected Mastery blueprints through the actual pool → item → template → family → outcome graph;
- verified all 240 active variants retain a Chapter I curriculum scope and a current programme trace;
- added RLS-protected reconciliation/provenance tables plus fail-closed completeness assertions;
- preserved all item, session, attempt and learner-history-bearing identifiers.

Disposition summary:

- 6 official outcomes: `new_official_outcome_missing` gap discovered and resolved;
- 10 skills: `mapping_updated`;
- 77 item families: `mapping_updated`;
- no wording change, material scope change, merge, split, removal or retirement required.

Post-migration read-back shows zero unmapped skills, zero unreconciled families and zero active items without traceability. Fresh reconciliation indexes produce only expected unused-index informational notices; there is no new-table security or actionable performance finding.

Skills remain in `review` status because standards reconciliation does not substitute for external Physics SME approval.

Exit criterion satisfied: every current Chapter I skill and assessment family is traceable to the current Physics 7 programme directly or as an explicitly justified derived micro-skill.

See `docs/sprint-11j-physics7-current-standard-reconciliation.md`.

### 11K — Curriculum Versioning, Provenance & Release Gates

**Status: ✅ Complete.**

Curriculum releases and assessment blueprints are now immutable, first-class identities. The active Physics 7 Unit 1 pilot release freezes 6 official outcomes, 10 skills, 77 item families, and exact 40/120/80 diagnostic/practice/mastery item memberships.

Implemented:

- an explicit legacy release for pre-11K evidence and an exact current pilot release for the reconciled 2026 baseline;
- release snapshots for units, outcomes, skills, item-family mappings, sources, reconciliation identity and content fingerprints;
- immutable assessment blueprints with exact item/version membership;
- non-null release, blueprint and provenance identity on sessions, attempts and exposure events;
- release-scoped mastery state and runtime reads;
- automatic session/evidence binding with cross-release mismatch protection;
- content-admin visibility for releases, gates and blueprints;
- fail-closed pilot/production activation gates, with external Physics SME approval required for production;
- RLS, governance write boundaries, composite foreign-key indexes and advisor hardening.

Historical evidence was not relabelled as current-standard evidence: 11 sessions, 94 attempts and 56 exposure events are bound to `physics7_u01_legacy_pre_11k`. New work resolves to `physics7_u01_2026_08_14_pilot_r1`.

Six pilot gates pass. `external_sme_approved` remains pending and blocks production promotion by design.

Invariant enforced:

> A curriculum update must create an auditable new version/release when semantics change; it must never silently reinterpret historical learner evidence.

See `docs/sprint-11k-curriculum-versioning-provenance-release-gates.md`.

### 11L — Re-baselined Chapter I Handoff & Pilot Controls

**Status: ✅ Complete for Sprint 11 handoff controls; controlled pilot remains blocked and continues in Sprint 11.5.**

The first 11L slice is implemented against `physics7_u01_2026_08_14_pilot_r1`:

- created a controlled pilot-run identity bound to the exact current curriculum release;
- classified the original 11 sessions and then reconciled three later exact-release QA sessions;
- current classification: 14 sessions total — 10 partially compatible legacy context and 4 incompatible sessions;
- the three later exact-release sessions are classified `outside_cohort` and excluded from formal pilot/calibration evidence;
- derived zero compatible/closure-eligible sessions, attempts or exposures;
- added six entry gates and five closure gates with technical, human or shared ownership;
- added RLS-protected governance tables and security-invoker reporting views;
- added a status guard that blocks advancement to entry-ready/running/observing/closed while required gates remain open.

Current pilot state at Sprint 11 handoff: **4/6 entry gates passed, 2/6 open; 0/5 closure gates passed**. The recorded pilot status remains `blocked`, with `entry_ready = false` and `closure_ready = false`.

Sprint 11 technical handoff closure is satisfied: 11F, 11G and 11H are passed/dispositioned, the evidence baseline is reconciled, and the pilot remains fail-closed with no false claim that a human cohort has run.

The following are intentionally deferred to **Sprint 11.5**: naming the operational participation-authorization owner, approving participant/guardian scope and handling, enrolling the cohort, and collecting real-user evidence. Analytics or research opt-in is not treated as operational participant/guardian authorization. No legacy evidence is counted as validation of the exact 11K release.

See `docs/sprint-11l-pilot-closure.md` and migration `0041_sprint_11l_pilot_evidence_classification.sql`.

## Sprint 11 closure gate — technical handoff readiness

Sprint 11 closure criteria are satisfied as of 2026-09-20:

1. 11F technical/production readiness is completed or each remaining item has an explicit accepted disposition.
2. Sprint 11G remaining route-level rendered QA is completed or explicitly dispositioned.
3. Sprint 11H post-deployment visual containment QA is completed or explicitly dispositioned.
4. 11I establishes the authoritative standards/source registry for the current implementation.
5. 11J reconciles Physics 7 Chapter I against the applicable current standard/programme.
6. 11K establishes curriculum-version/provenance rules sufficient to preserve historical interpretation and exact-release identity.
7. 11L confirms that historical evidence is classified, the exact-release pilot baseline is explicit, and pilot governance remains fail-closed until human gates are satisfied.
8. Critical technical, privacy, security, curriculum or scope defects discovered during handoff QA are fixed or explicitly accepted.
9. A **Sprint 11 technical handoff report** records implemented capability, accepted limitations, unresolved non-handoff blockers, and the exact conditions under which another person may begin testing. ✅ See `docs/sprint-11-technical-handoff-report.md`.

**Sprint 11 status: ✅ Complete for technical handoff readiness.**

Sprint 11 closure **does not claim** that a controlled human pilot has run, that participant/guardian authorization exists, or that the learning model is empirically calibrated.

## Sprint 11.5 — Controlled External Tester Pilot

Sprint 11.5 begins only after Sprint 11 is technically handoff-ready.

Purpose: let one or more real users/testers use the exact current release under a controlled operating process, while preserving the fail-closed governance already implemented in 11L.

Required before evidence can count toward formal pilot review or Sprint 12 calibration:

- name the operational participation-authorization owner;
- approve the participant/guardian information and authorization workflow where applicable;
- define cohort/tester scope, dates, teacher scope, identity minimization, withdrawal, suspension and deletion handling;
- enroll only authorized participants into the controlled cohort;
- preserve exact curriculum-release and blueprint provenance.

Then observe and record:

- Diagnostic → Practice → Mastery lifecycle;
- teacher/usability evidence;
- repetition/exposure behavior;
- item/content defects;
- standards-alignment observations;
- operational defects and accepted limitations.

A person may perform **informal QA/usability testing** after Sprint 11 handoff, but their activity must not be represented as formal pilot/calibration evidence unless the Sprint 11.5 authorization and cohort gates are satisfied. If the tester is a minor, any applicable participant/guardian authorization remains part of Sprint 11.5 rather than being bypassed.

Sprint 11.5 closes with an approved pilot/test report and an evidence sufficiency decision for Sprint 12.

See `docs/sprint-11-5-controlled-external-tester-pilot.md` for the execution plan.

## Sprint 12 — Learning-Model Calibration

**Status: ✅ Complete — 12A readiness complete; 12B closed with deferred/no-change disposition.**

Sprint 12 is split into two phases so technical preparation does not stall while informal review continues.

### 12A — Calibration Readiness

12A may run now, in parallel with asynchronous informal content/usability review. Informal reviewer activity remains QA/context only and is excluded from empirical calibration.

**12A.1–12A.3 are complete and have passed a methodology audit.** The audit corrections are now implemented:

- the learning-model baseline remains immutable as `baseline-2026-09-20-r1`;
- every future learning session is fail-closed stamped with its exact immutable learning-model configuration; prior sessions remain explicitly `unbound_legacy` rather than guessed;
- remediation guides have immutable version snapshots, and future help events preserve the exact rendered Armenian help text;
- learner recommendations have append-only issued/shown/clicked/action_started telemetry with dashboard and after-attempt policies kept distinct;
- the operative evidence contract is `contract-2026-09-20-r2`, using metric-specific eligibility and exact curriculum/blueprint/model provenance;
- the operative metric set is `metrics-2026-09-20-r2`, using learner-cluster-aware reporting, right-censoring where appropriate, expanded Hinting v2 analysis and no universal sample-size/interval rule;
- r1 contract/metric records remain immutable historical drafts;
- no learning parameter was changed.

**12A.4 is complete after closure-audit correction:** the read-only, service-role-only pipeline is pinned to an immutable pilot scope, enforces the full r2 entry/pilot-state boundary, models the actual 4/5 recovery event, provides analysis-ready learner/learner-skill outputs, preserves provenance, and exposes all 11 exact r2 metric keys.

**12A.5 is complete:** immutable protocol and decision records enforce hypothesis → eligible evidence → learner-aware sample/limitations → baseline/candidate comparison → side effects → explicit disposition → new approved configuration when changed → preserved history. Allowed outcomes include explicit `no_change` and `deferred`; observation counts never auto-authorize tuning. The one-adult feasibility pilot is now running prospectively, but its opening snapshot still has zero formal observations for all 11 metrics. No decision or model version was created and 12B remains evidence-gated.

See `docs/sprint-12a-methodology-audit-corrections.md` and `docs/sprint-12a5-calibration-decision-protocol.md`.

### 12A — Hinting & Remediation v2 foundation

The Practice help layer now supports deterministic task-aware scaffolding while retaining the existing skill-level fallback. The initial v2 rollout covers all 8 parameterized Chapter I templates (80 published variants) with progressive **orient → strategy → analogous worked example** help, safe raw-parameter interpolation and richer remediation telemetry.

Diagnostic and Mastery Check remain hint-free. The learning-model thresholds and assisted-positive evidence multiplier are unchanged. Fixed/authored templates receive specific guides selectively where they add pedagogical value rather than through mechanical full-bank duplication.

See `docs/sprint-12a-hinting-remediation-v2.md`.

### 12B — Empirical Calibration

12B reviewed the formal Sprint 11.5 feasibility evidence on 2026-09-21. The evidence was judged insufficient for tuning and the immutable decision `physics7-u01-feasibility-2026-09-21-deferred` was recorded. No parameter changed.

Sprint 12 then analyzes curriculum-compatible learner behavior:

- are students classified as mastered too early or too late?
- do some skills require excessive practice?
- are items easier/harder than intended?
- does hint use distort evidence?
- are diagnostic results consistent with later performance?
- are mastery checks producing plausible outcomes?
- how often do recommendation rules send learners in the wrong direction?
- do calibration conclusions differ by curriculum version or materially changed skill definition?

Calibration evidence must be curriculum-version aware. Evidence from materially different skill definitions or blueprints must not be pooled as though it were one construct.

Where calibration settings change, model/configuration versioning must preserve the meaning of historical evidence. Material mastery/confidence outputs must retain the model/configuration version that produced them. Calibration must explicitly support **Insufficient Evidence** rather than forcing a mastery conclusion, and consequential classifications/recommendations must be explainable from the evidence actually used. If evidence is insufficient, record a no-change/defer disposition rather than forcing a parameter change.

See `docs/sprint-12-learning-model-calibration.md` for the implementation plan and deployed-model baseline.

## Sprint 12.5 — Universal Chapter Review & Mastery-Retry Lifecycle

**Status: 🟡 Closure verification — 12.5A–Z deployed. Authenticated desktop learner/teacher QA and the required-Review/retry plus final-failure lifecycle branches pass. Only authenticated mobile-width learner/teacher rendering remains open. Sprint 13 remains on hold.**

Establish a universal, versioned platform policy for every present and future grade, subject, programme and unit:

- at most three Mastery Check attempts;
- a completed qualifying Chapter Review is required after failed Attempts 1 and 2;
- passing any attempt ends the mandatory retry loop;
- failed Attempt 3 creates final `mastery_failed_final` and prohibits Attempt 4;
- Chapter Review remains permanently available after pass or final failure;
- Chapter Review is a first-class session mode with required/voluntary contexts and auditable whole-chapter rotation;
- later Review evidence never revokes a historical Mastery pass and never contaminates pre-mastery Practice/calibration evidence;
- recommendations, learner UX and teacher analytics follow the server-authoritative state machine;
- historical records are migrated without fabricating attempt numbers or policy provenance.

The policy must be cross-subject and cross-grade. No school, teacher or chapter may silently override it. Administrative exceptions are outside the normal learner flow and require separate governance if introduced later.

Detailed specification: `docs/sprint-12-5-universal-chapter-review-mastery-retry.md`.

**QA correction — 2026-09-22:** authenticated voluntary Chapter Review testing exposed that the legacy shared item-exposure pipeline still rejected `chapter_review`. Migration `0076_sprint_12_5_chapter_review_exposure_integration.sql` extends served, answered and help exposure provenance to Chapter Review; rollback-only production probes verified question serving, exposure finalization and answer recording. Runtime provenance is `runtime-2026-09-22-r11`. This correction does not change learning parameters or lifecycle policy.

**Assessment-integrity correction — 2026-09-23 — 12.5Z:** authenticated QA exposed that single-choice options were always serialized in canonical authoring order, allowing repeated exposure to teach answer positions/keys. The shared assessment boundary now persists a private per-session-item option permutation for every single-choice item, randomizes new presentations server-side under `mcq-option-order-v1`, prevents an identical permutation on consecutive exposures of the same item to the same learner, and preserves the stored order across refresh/resume. Learner-visible A/B/C… labels are presentation positions only; canonical option identities remain private and are resolved server-side before grading. The mechanism is attached to `learning_session_items`, so it applies to Diagnostic, Practice, Mastery Check and Chapter Review and is not Physics-7-specific. Existing active unanswered items at rollout were grandfathered in canonical order to avoid changing a question already seen; answered history was not backfilled with fabricated presentation provenance. Direct learner/anonymous canonical option reads were removed. The current bank audit found 119/119 published MCQs structurally valid. A position-dependent-language audit found no current MCQ requiring fixed order; future fixed-order exceptions must explicitly set `shuffleOptions=false` with a non-empty `optionOrderRationale` or serving fails closed. An eight-exposure rollback/cleanup probe produced eight valid v1 mappings with no consecutive duplicate order, CI and Vercel are green, and active runtime provenance is `runtime-2026-09-23-r16`. No item-selection rule, score, mastery threshold, Hinting policy, Review policy or learning parameter changed.

## Sprint 13 — Chapter I Standards-Verified Production Release

Chapter I becomes the first reference-quality production unit only when all applicable gates are satisfied:

- current national-standard provenance recorded;
- current Physics subject-standard provenance recorded;
- Physics 7 programme mapping verified;
- unit/outcome/skill crosswalk verified;
- SME review completed;
- assessment pools sufficient and versioned;
- item defects corrected;
- mastery behavior calibrated where evidence allows;
- accessibility/UX stable;
- teacher workflow usable;
- no unresolved critical curriculum, privacy, security or technical defect.

Chapter I then becomes the gold-standard implementation against which later units are built.

## Sprint 14 — Multi-Tenant, Multi-Grade / Multi-Subject Academic Architecture

**2026-09-28 action acceptance checkpoint:** [Production run 36354453046](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/36354453046) passed **141/141 action-run checks**, plus **54/54 read checks before and after**, at `7787ed62e861ef6d42dad785a420e1501d2b4a6f`. Two generic UI defects were fixed and deployed: archived classroom URLs no longer request active evidence contexts (PR #53), and stale school-admin roster responses cannot duplicate or overwrite current cards (PR #55). CI passed 562 tests, typecheck, browser syntax and institutional concurrency checks. [Durable report, cleanup verification and exclusions](sprint-14-authenticated-actions.md). Sprint 14 and 14D remain open.

**2026-09-28 acceptance checkpoint:** authenticated production two-school **read isolation passed 54/54 checks** with six real QA identities. [Live run](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/36350990655); [scope, durable evidence and remaining gates](sprint-14-authenticated-isolation.md). This closes the read-isolation subgate only; no learner data or lifecycle action was changed.

**2026-09-27 bounded checkpoint deployed:** teacher offboarding and database-enforced final school-administrator protection ([PR #47](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/47), merge `5be0464d9c665d1c088cf5c67171d785a1f19f92`). CI #914 passed 512 tests, typecheck and nine real PostgreSQL concurrency scenarios. Production migration, three JWT-protected APIs and dashboard assets are verified. No real teacher was offboarded. See [checkpoint](sprint-14b-teacher-offboarding.md). Authenticated end-to-end action QA remains part of the open acceptance work. Other Sprint 14 gates remain open.

**14B checkpoint (2026-09-24): 🟡 Targeted enrollment, termination, guarded first-school bootstrap and staff-account provisioning deployed.** [Implementation record](./sprint-14b-targeted-institutional-enrollment.md). The platform admin issues the first school-admin invitation; an active school admin invites teachers to their own school and published subject. Recipients confirm email and set their own passwords; self-service reset uses an email link. The user reports successfully activating a school admin and teacher and receiving the teacher invitation after setting up SMTP. These are recipient reports; authenticated production verification remains pending. Pending staff invitations can be listed and revoked under current school/platform authority, with revoker audit. The school account console QA polish is on main; GitHub CI #797 passed at `1884db91`.

**Shared entry and learner account checkpoint (deployed 2026-09-24):** [PR #21](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/21) was merged at `ed08789e52ffb0ae3643a34082ce858d9d6b98bb`; [CI](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/36048661361) and Vercel passed. One `/account-access` password form routes active known roles to their own workspaces, including school admin. The public home offers student self-registration and staff invitation guidance. A new student still starts with no classes; the existing eight-character legacy teacher code or link can enroll them only in an unscoped class. The sign-in return to `/join.html` accepts only a validated code. Unknown/missing profiles fail closed in the student home. Staff workspaces link to shared entry rather than collecting a second set of credentials. `manage-teacher-class` v5 rejects institutional teachers from legacy schoolless class actions; `get-teacher-dashboard` v8 returns their bounded dashboard state, and the UI shows a clear notice. Production public browser QA passed home, registration, class-code return and teacher sign-in link. Authenticated cross-role and two-school QA remain pending. A school-scoped institutional enrollment is still separate from legacy course entitlement: implement academic-context-scoped learner reads, assignment and evidence isolation, and a bounded school class invitation before claiming school student course access. Never write institutional memberships into `class_memberships` or infer a school for historical records.

**14B action acceptance (2026-09-28): passed** for reciprocal class/staff mutation denials, teacher navigation/rename/archive and school-admin offboarding cancel/confirm using six real QA identities. Only new empty classes and temporary teacher memberships were changed; original access and enrolments were preserved. See [scope and evidence](sprint-14-authenticated-actions.md). Live-session gates, admin MFA, safe role transitions, teacher offboarding and final school-administrator mutation guards are implemented. No institutional rollout, legacy evidence reassignment or automatic teacher handover is authorized by this checkpoint; permanent deletion remains Sprint 18.

**14A status (2026-09-23): 🟡 Identity and authorization foundation deployed.** Migrations 0080–0082 are applied. The server-only context resolver is exposed through an authenticated, read-only teacher endpoint; legacy class management, join codes and teacher evidence endpoints are fenced to school-unscoped classes. The database blocks legacy membership in a scoped class and freezes existing class school/year identity. Teacher analytics still assumes `PHY7-U01` and does not yet consume the new context; institutional enrollment, evidence scoping and the complete two-school release gate remain open. The bounded 14A implementation plan is recorded in [Notion](https://app.notion.com/p/3e4355a472bf81bca43bd8557727ca7f). Live schema inspection found five historical classes with no school assignment and four class memberships. Preserve these records as unbound legacy evidence; do not infer schools or backfill session identity. Begin with additive school/year/membership identities and a server-authorized academic-context contract, then verify two-school denial and two-chapter/subject coverage before release. Sprint 13's external SME release gate remains open.


Sprint 14 generalizes the platform across four coupled domains.

### Academic architecture

```text
Curriculum Framework Version
  -> Subject / Subject-Area Standard Version
      -> Subject Programme Version
          -> Units
              -> Topics
                  -> Learning Outcomes
                      -> Skills
```

Assessment engines must resolve the requested unit's skill set and blueprint. They must not assume `PHY7-U01`, 10 skills or 20 questions.

### Institution architecture

```text
Institution / School
  -> Academic Year
      -> Institutional Membership
          -> Grade / Cohort
              -> Class Instance
                  -> Subject Programme
```

The curriculum is shared centrally. Classes are school/teacher-specific delivery instances.

### Analytics scope boundary — Sprint 14C vs 14D

This distinction is binding for planning, implementation and closure claims:

- **Teacher analytics are core product functionality and a blocking Sprint 14C deliverable.** Teachers must be able to inspect authorized grade/class/student performance for everyday instructional decisions. Sprint 14C restores the already sanctioned teacher roster, skill matrix, filters and student drawer inside institutional classes; it does not invent a replacement dashboard.
- **School-wide analytics are later administrative aggregation and remain gated behind Sprint 14D.** School-wide, cross-class and administrative roll-ups must not delay, replace or redefine the teacher analytics required in 14C.
- Institutional teacher analytics must resolve the teacher's active assignment and exact school, academic year, class, subject programme, curriculum release and unit on the server. Client or URL state may preserve a selection but never grant access.
- Only evidence stamped `academic_context_status=exact` for that complete context may enter institutional class/student aggregates. `unbound_legacy` evidence remains excluded unless a separately approved legacy view explicitly identifies it.
- For any active `pilot` or `production` curriculum release, the immutable `curriculum_release_units` snapshot is authoritative for the unit code, title and sequence used by analytics. A mutable authoring record's editorial status or later metadata change must neither hide that released context nor silently rewrite its identity.
- The 14C teacher surface must expose class performance summary, skill matrix, support/review/inactivity filters and a student drill-down covering Diagnostic, Practice, Chapter Review and Mastery Check. Empty and partial data must remain visible and honest.
- Undefined cross-subject ability scores, school-wide roll-ups, bulk import and academic-year rollover are not part of the 14C teacher-analytics slice.

**14C acceptance:** an actively assigned teacher can select an authorized class/course/unit, inspect only that exact context's evidence, preserve the selection across refresh/back/deep-link navigation, and cannot cross school/class/assignment/programme/release/unit boundaries by changing identifiers.

**14D acceptance:** authorized school administrators receive separately verified school-wide aggregation only after the 14C evidence and isolation gate passes.

### 14C teacher-analytics production checkpoint — 2026-09-26

- The sanctioned institutional teacher experience is live without a replacement dashboard: the existing roster, class summary, skill matrix, support/review/inactivity filters and student drawer now consume server-authorized exact-context evidence.
- Authenticated production QA on the assigned Physics 7 class showed three rostered students: one learner with exact-context activity and two honest empty states. The learner drawer showed the single exact Chapter Review session (11/12 correct, 12 item attempts) and did not surface the learner's unbound legacy session.
- Stable navigation preserved the exact class, assignment, curriculum release and unit identifiers across refresh. The drawer identified Physics, Grade 7 and Chapter I before chapter-specific Review and skill evidence.
- A production-only gate mismatch was corrected: active pilot/production analytics now use the immutable release-unit snapshot even while the mutable authoring unit remains in editorial review. No curriculum content or lifecycle status was changed.
- GitHub PR [#31](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/31) delivered the restoration and CI #872 passed. PR [#32](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/32) delivered the release-snapshot correction and CI #874 passed. Vercel is green; Supabase runs `get-teacher-dashboard` v14 and `get-teacher-student` v9.
- Open before the complete Sprint 14 evidence/isolation gate: authenticated two-school mutual denial and live switching across a second authorized unit/course context. School-wide administrative aggregation remains 14D and is not activated by this checkpoint.

### Teacher analytics context scoping

Teacher analytics must never rely on an implicit or hard-coded "current chapter". Every learner-analytics request and rendered analytics surface must carry an explicit academic context:

```text
Class / course assignment
  -> Subject Programme Version
      -> Unit / Chapter
          -> Student analytics
```

The teacher UI must provide an explicit chapter/unit selector within the selected class/course context. A chapter-scoped student drawer must display the subject/grade, chapter sequence/code and localized chapter title immediately above chapter-specific analytics such as mastery attempts, Chapter Review, skill evidence and interventions.

The API contract must expose a canonical context object sufficient to render and authorize that scope, including at least:

- class/course assignment identity;
- subject and grade identity/display label;
- subject-programme version;
- curriculum release/version;
- unit/chapter ID and code;
- unit/chapter sequence or display number;
- localized unit/chapter title.

Teacher-dashboard queries must resolve skills, attempts, learning sessions, mastery checks, Chapter Reviews and recommendations from the selected programme/unit. They must not use global constants such as `UNIT_CODE`, code-prefix filters such as `PHY7-U01-S%`, or UI strings that assume Physics 7 / Chapter I.

The selected academic context must be server-validated against the teacher's legitimate class/course assignment before analytics are returned. Changing the selected chapter must not leak or mix evidence from another unit, subject, grade, class or curriculum release.

The UI should preserve the selected class/course/unit context in stable navigation state (URL/query state or equivalent) so refresh, back-navigation and deep links return to the same scoped analytics view.

Course-level aggregation is a separate presentation layer. Chapter-level mastery/review metrics remain chapter-scoped and must not be silently aggregated across units.

**Sprint 14 acceptance checks for this slice:**

- one teacher can switch between at least two chapters in the same course and see distinct chapter-specific analytics;
- the same teacher can switch between at least two assigned subject/course contexts without cross-context evidence bleed;
- student drawer headings and roster analytics identify or inherit an unambiguous selected chapter context;
- APIs reject a unit/programme context not assigned to the requesting teacher/class;
- no teacher analytics path depends on `PHY7-U01`, a fixed skill count, or a singleton `UNIT_CODE`;
- existing Physics 7 Chapter I data remains valid under the generalized context model;
- regression coverage proves that class/course/chapter context survives refresh/navigation and that records from different units/releases cannot collide.

The current Physics 7 Chapter I heading introduced during Sprint 12.5 is a transitional UX clarification only; Sprint 14 replaces that fixed display context with this data-driven selector and API contract.

### Authorization architecture

Target roles/scopes:

- platform/super admin — cross-platform administration only where required;
- central content admin/reviewer — centrally governed standards/curriculum/content;
- school admin — own institution only;
- teacher — legitimately assigned classes/courses only;
- student — own account and entitled learning contexts only;
- future bounded roles such as school leadership, support operator or parent/guardian.

A role name alone must never grant cross-school visibility.

### Enrollment architecture

Account identity and institutional membership are separate concepts.

Production-compatible enrollment must support controlled paths such as:

- school invitation / roster provisioning;
- bounded school registration token;
- teacher/class invitation linked to a school;
- revocable/expiring/usage-limited join codes;
- school-membership requirement before joining restricted classes where configured.

Open account creation, if retained, must not grant school or course access automatically.

### Student invitation actor boundary

The authorized chain is platform admin → school admin → teacher → student:

- the school admin invites and authorizes teachers;
- an actively assigned teacher issues student invitations from inside the exact assigned class;
- each student invitation is bound to that teacher's active school, academic year, class and subject programme assignment;
- invitations remain single-use, expiring and revocable, and the student chooses their own password;
- the school admin may inspect tenant-scoped institutional rosters but does not issue ordinary student invitations.

Any change to this actor boundary requires an explicit approved roadmap decision before implementation.

### Central content governance

Official national curriculum, standards mappings, canonical skills, assessment blueprints and validated assessment pools remain centrally governed.

Schools/teachers may control local delivery context such as:

- classes;
- assignments;
- deadlines;
- pacing;
- supplementary/local activities.

Locally created content must not silently enter the canonical national assessment bank.

### Time-aware identity and lifecycle foundation

Learner identity persists across academic years and school changes while institutional memberships are historical, time-bounded relationships. The data model must support Academic Year as a first-class entity; time-bounded student enrollments, classroom memberships and teacher assignments; teacher/classroom handover without rewriting historical authorship; and later rollover without renaming/overwriting prior-year structures.

### IAM, audit and accommodation foundations

Account, role and membership remain separate. Privileged access follows an authorized chain of trust, protected requests are authorized server-side, and significant role/membership/admin actions retain actor + institutional scope in the audit trail. The architecture must also permit private, authorized learner accommodations without changing the curriculum standard being assessed.

### Tenant-isolation release gate

Create at least two schools and multiple users:

```text
School A
  -> Admin A
  -> Teacher A
  -> Student X

School B
  -> Admin B
  -> Teacher B
  -> Student Y
```

Verify:

- Admin A cannot access School B;
- Teacher A cannot access School B;
- Teacher A sees only legitimate course/class evidence;
- Student X cannot claim School B membership without authorization;
- central canonical content is shared without sharing private learner records;
- learning state cannot collide across subjects, grades, schools or classes;
- audit events preserve actor, scope and institutional context.

This is a Sprint 14 release gate.

### Architecture readiness checkpoint

Before Sprint 14 closes, verify that the implemented foundations can support curriculum/question versioning, evidence confidence/uncertainty and model provenance, multi-tenant IAM/audit, academic-year rollover/teacher handover, and historical data-integrity checks **without redesigning the core identity/evidence model**. This is a release checkpoint inside Sprint 14, not a separate sprint.

### 14B school-admin operational overview checkpoint — 2026-09-25

**Status: ✅ deployed and authenticated production-render verified; Sprint 14 remains open.**

- GitHub implementation merges: `de9720c1ce4607dfe45efc546e3a7bedde421116` (PR #23) and `5b24cbadcd26c67d98fa95eebbf6cdbc91c78083` (PR #24 sidebar correction).
- Added read-only `get-school-admin-overview` Edge Function v1 with live-session validation and role/tenant-derived authorization.
- Preserved the approved HaiEdu school overview—brand sidebar, header, summary cards and quick actions—and removed the teacher hierarchy from that page.
- The approved `Ուսուցիչներ` view remains the teacher directory. Active teacher names now open a dedicated teacher page; assigned classes/grades are shown there, and each class expands to its tenant-scoped student roster.
- CI #852 and #854 passed, both Vercel deployments succeeded, and authenticated production QA passed the complete overview → Teachers → teacher → class accordion flow.
- Production evidence currently contains 1 teacher, 1 class, 0 enrolled students and 1 authorized subject; the expanded class correctly shows the empty-roster state.
- Performance analytics remain explicitly gated. No score, progress or intervention metric is shown until Sprint 14C establishes trustworthy context-scoped learner evidence.
- Existing test data needs cleanup: class name `Math 7A` is currently paired with the authoritative Physics subject assignment.
- 14C foundation deployed in PRs #25–#27 and corrected in PR #30 to the sanctioned actor boundary: only the actively assigned teacher issues a student invitation from the exact assigned class; the School Admin retains roster visibility but does not issue ordinary student invitations. Exact school/year/class/teacher-assignment/subject-programme enrollment, assigned-class teacher roster, immutable institutional session context and negative authorization coverage are preserved.
- Historical evidence remains explicit: all 58 pre-existing sessions are `unbound_legacy`; no legacy row was falsely backfilled.
- Automated suite passed 115/115 after the teacher-owned invitation correction; production migrations `0108`–`0110` plus `20260925214539`, Edge Functions and Vercel deployments are live.
- The narrow Supabase Auth student-invitation return URL is allow-listed. A controlled invitation to an existing learner account was accepted successfully on 2026-09-26.
- Controlled closure passed on 2026-09-26: the assigned teacher issued the invitation, the learner accepted it, the pending invitation cleared, the assigned class roster increased from two to three learners, and the first newly created post-enrollment session was stamped with exact institutional context.
- Still open: remaining offboarding/last-admin controls, authenticated two-school mutual-denial evidence, teacher chapter selection, student evidence drawer/API work and later trustworthy analytics.


### 14C controlled production closure verification — 2026-09-26

**Status: ✅ student onboarding and exact-context session stamping passed; Sprint 14 remains open.**

- The actively assigned teacher issued invitation `a379cdf2-9ce3-4a33-a761-497575b193d9` inside the exact Test School / 2026–2027 / Math 7A / Physics assignment. Acceptance `7898d74f-2f13-425a-9c9f-a0f8faf64326` created active enrollment `83e94781-c436-4a1c-b8a0-2d344d9fd682`.
- Authenticated production teacher QA passed after refresh: the pending invitation disappeared, the class count changed from two to three, and Hovhannes Vanesyan appeared in the assigned class roster.
- Historical Review session `a94ea905-7515-4404-9c79-b862ba829081` remained correctly `unbound_legacy`; no historical evidence was rewritten.
- The first newly created post-enrollment session `b3ad7e27-bae2-4345-8282-eb2f6169c048` completed 12/12 with 11 correct and `academic_context_status=exact`. It retains the exact enrollment, school, academic year, class, teacher assignment, subject programme, curriculum release, assessment blueprint, learning-model configuration and runtime build.
- The rollback-only authorization probe passed again: the actively assigned teacher could issue/revoke within the exact assignment, the School Admin was denied ordinary student-invitation authority, and no probe data persisted.
- This closes the controlled production action for onboarding and session stamping only. Tenant-isolated evidence APIs, authenticated two-school mutual denial, teacher chapter selection and the student evidence drawer remain separate open 14C work.

### 14B/14C teacher workspace completion checkpoint — 2026-09-26

**Status: ✅ implemented, merged and deployed; Sprint 14 remains open.**

- [PR #34](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/34) (`f423fefdc52651c02458537e8e822aedd98138c7`) completed the missing institutional classroom-creation wiring for invited school teachers, including authorized school/year/subject context and bounded prerequisite messaging.
- [PR #35](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/35) (`cb341d9f0019b01db0579890005530b902180d56`) added validated, deduplicated bulk email invitations for up to 20 learners while preserving a distinct single-use invitation per recipient and safe quota handling.
- [PR #36](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/36) (`92bcc95e8bbe496bfbf2213765e126228dab66fc`) restored optional 72-hour, one-use institutional join codes tied to the exact active teacher assignment, school, academic year, classroom and subject. Redemption adds only that classroom enrollment and preserves the learner account and every existing enrollment.
- [PR #37](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/37) (`b4371a0d26db30ef1579397ac8a30df8b5bfff22`) replaced the brittle roster grid with Armenian-safe responsive flex wrapping. [PR #39](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/39) (`f69e3469f9bd868cadf61c186c9975ce094424a4`) extended that responsive contract across student, teacher, school-admin, master-admin and content-reviewer dashboards.
- [PR #38](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/38) (`dcfa241c81113c867d17a0841064e605a33580c4`) made account-data/privacy inventories role-specific at both server and client layers; staff profiles no longer receive or render the learner-performance inventory.
- [PR #40](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/40) (`f26539ac9b424793624151f116d7ac4d56510c5d`) converted the teacher sidebar into URL-addressable Home, Profile, Active Classrooms and Archive views, kept classroom creation as an action, and moved archived classrooms to their own dedicated page.
- [PR #41](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/41) (`01d35ef542fefcf789e2f6cf9be5366b62d1eea7`) added 2–120 character classroom renaming for legacy and institutional classrooms. Authorization remains owner/active-assignment scoped; institutional changes use a service-only audited RPC, and renaming preserves classroom identity, enrollments and evidence.
- Automated CI and the corresponding Vercel production deployments passed for these slices. Rollback-only database probes covered institutional join-code and classroom-rename authorization without persisting probe data.
- **Do not redo these items in later Sprint 14 work.** Teacher offboarding and remaining last-admin mutation controls were subsequently deployed on 2026-09-27. The authenticated two-school class/staff mutation and teacher navigation/rename/offboarding action gates subsequently passed on 2026-09-28. Residual Sprint 14 work includes multi-unit/multi-context switching after a second authorized release exists. School-wide administrative analytics remains the separate 14D gate.

## Sprint 15 — Grade 7 Physics Expansion — Chapters II–VI

### 15A — Content and Hint Authoring Tools — mandatory entry slice

Before bulk hint production or publication for Chapters II–VI, implement a protected Content Reviewer authoring workspace that works across subjects, grades, programmes, units, skills and item templates even though Physics 7 is its first production use.

Required capabilities:

- browse, search and filter skill-level and item-template remediation guides by subject, grade, programme, unit/chapter, skill, template, guide scope and lifecycle status;
- edit the Armenian title, strategy, Hint 1, Hint 2, analogous worked example, optional error-code specialization, allowed raw-parameter placeholders and source/reference metadata;
- preview parameterized guides against real item variants without evaluating derived answers;
- support draft → review → publish → archive, with only authorized Content Reviewer/Content Admin or bounded Platform Admin sessions able to publish or archive;
- require server-side authorization for every read/write action and AAL2/step-up protection for publish/archive actions;
- preserve immutable guide versions, exact rendered-text snapshots, actor, timestamp and change rationale; production content must never be silently overwritten;
- validate missing/disallowed placeholders, fallback resolution and obvious answer leakage; analogous examples must use different values or context from the live item;
- retain the runtime resolver order: error-specific template guide → default template guide → skill fallback;
- regression-test permissions, version history, preview/rendering, placeholder safety, fallback behavior and authenticated browser workflows.

Entry gate:

- Chapters II–VI curriculum and textbook mapping may proceed in parallel.
- Bulk hint authoring, import or publication for Chapters II–VI must not begin until 15A passes.
- The existing Chapter I hints remain operational and editable through the governed backend until the UI is deployed.

Explicit exclusions:

- no live AI/LLM hint generation;
- no teacher authority to edit or publish canonical hints;
- no change to mastery thresholds, assisted-evidence weighting, diagnostic or Mastery Check hint policy;
- teacher-facing hint reporting/dispute intake may be added later through the governed content-correction workflow.

After the 15A gate, every remaining Physics 7 unit follows the same controlled pipeline:

```text
current Physics 7 programme
  -> official outcomes
      -> textbook/navigation mapping
          -> HaiEdu skills
              -> prerequisites
                  -> item bank
                      -> unit diagnostic
                          -> skill practice
                              -> unit mastery verification
                                  -> SME/content QA
                                      -> pilot evidence
                                          -> production
```

No invariant requires every unit to contain 10 skills. Assessment blueprints derive from the unit's actual skill structure.

## Sprint 16 — Physics 7 Reference Course Integration

The complete Physics 7 reference product includes:

- all curriculum units;
- unit diagnostics;
- adaptive skill practice;
- remediation;
- unit mastery checks;
- recommendations;
- prerequisite-aware remediation where the curriculum model supports it;
- student-facing mastery states that distinguish Secure / Practising / Needs Work / Not Attempted or equivalent evidence-aware states;
- progress;
- teacher dashboard;
- course-level aggregation across units.

Course-level progress summarizes unit evidence. A future cumulative/final course assessment, if added, remains a separate assessment type.

## Grade 7 four-subject MVP gate

Technical, content and browser QA may continue before this gate. The **formal school MVP pilot must not start** until the production-qualified Grade 7 bundle contains:

1. Physics;
2. Mathematics;
3. Armenian Language;
4. English.

For Mathematics, Armenian Language and English, the minimum MVP scope is one **production-ready vertical slice per subject**, not a shell, navigation fixture or unreviewed placeholder. Each slice must include:

- an applicable current official standard/programme source chain and immutable curriculum-release identity;
- reviewed outcomes, skills and subject-appropriate evidence design;
- one coherent unit with sufficient reviewed items/content to exercise Diagnostic, Practice, Review/remediation and Mastery Check;
- deterministic or explicitly governed scoring appropriate to the supported task types;
- learner progress, teacher assignment/visibility and school analytics;
- role, tenant, grade, subject, programme and release isolation;
- desktop/mobile, accessibility, localization and end-to-end regression evidence;
- an explicit content/SME release disposition.

This is the minimum gate for testing a multi-subject institutional MVP. It does **not** claim full-year Mathematics 7, Armenian Language 7 or English 7 parity with the complete Physics 7 reference course. Requiring full-year parity for all four subjects is a separate product-owner scope decision.

## Sprint 16.1 — Mathematics 7 MVP Vertical Slice

Model and implement one representative Mathematics 7 unit from the applicable official programme. The slice must test mathematics-specific skill structure, answer representation and deterministic grading rather than reusing the existing Mathematics navigation fixture as curriculum.

## Sprint 16.2 — Armenian Language 7 MVP Vertical Slice

Model and implement one representative Armenian Language 7 unit from the applicable official programme. The slice must test language-appropriate outcomes, content and evidence while preserving the distinction between automatically scored evidence and any human-reviewed work.

## Sprint 16.3 — English 7 MVP Vertical Slice

Model and implement one representative English 7 unit from the applicable official programme. The slice must test language-appropriate outcomes, content, localization boundaries and evidence while preserving deterministic/auditable mastery decisions.

## Sprint 16.4 — Grade 7 Four-Subject MVP Integration

Verify the four subjects as one institutional product:

- entitlement and navigation behavior across all four subjects;
- no collision of learner state, sessions, attempts, mastery or recommendations across subjects;
- assignments, rosters and teacher visibility scoped to valid teacher/subject/class relationships;
- subject-aware dashboards and course progress;
- curriculum-release, blueprint, runtime and learning-model provenance;
- shared Review/mastery lifecycle behavior where applicable, with explicit subject-specific differences;
- two-school tenant isolation;
- authenticated desktop and mobile browser QA;
- production deployment and rollback readiness.

## Sprint 17 — Grade 7 Four-Subject School MVP Pilot

Run the formal Grade 7 MVP under controlled school conditions only after the Sprint 16.4 gate passes:

- all four MVP subjects represented;
- several classes;
- multiple teachers, including valid subject assignments;
- school-admin workflows;
- controlled student enrollment;
- progression between units and subjects;
- standards-aligned curriculum coverage;
- teacher interventions;
- retention;
- usability;
- operational support;
- student behavior over time;
- engagement/active-learning telemetry;
- teacher intervention recording;
- actionable early-warning/notification behavior;
- approved assessment accommodations where configured.

Pilot reporting must keep subject, unit, curriculum release and evidence model visible. Results from one subject must not be generalized to the other three without evidence.

## Sprint 18 — Production Hardening & Curriculum-Change Operations

Engineering hardening:

- performance;
- observability;
- monitoring;
- backups;
- recovery;
- error tracking;
- CI/CD;
- database optimization;
- security regression;
- tenant-isolation regression;
- capacity testing;
- operational data-quality/integrity checks;
- incident-response procedures and security-event handling;
- tested backup **and restore** procedures;
- feature flags / controlled rollout and rollback for material platform/model changes;
- localization architecture so UI/content-language behavior is not hard-coded.

Curriculum-change operations:

```text
new official standard/programme/amendment
  -> register version
      -> diff against active release
          -> identify affected outcomes/skills/items
              -> expert review
                  -> publish new curriculum release
                      -> migrate active delivery safely
                          -> preserve historical evidence
```

Bad curriculum releases must be reversible without corrupting historical learner evidence. Content corrections/disputes must preserve question provenance and prior versions rather than silently editing validated production history.

## Sprint 18.5 — Academic-Year Lifecycle, Rollover & Continuity

Implement the operational lifecycle whose data foundations are established in Sprint 14.

Core invariant: **students persist; academic structures change; history is never overwritten.**

Support:

- Prepare → Preview → Validate → Confirm → Activate for a new academic year;
- active-year operation followed by Close → Archive;
- progression states: Promote, Repeat grade, Internal transfer/reassignment, Leaving institution, Pending/Unknown;
- new class instances and teacher assignments for the new year rather than renaming old ones;
- archived prior-year classrooms with preserved assessments, evidence, interventions and authorship;
- teacher/classroom continuity and authorized handover when staff change;
- validation for duplicate/missing enrollments, unassigned students, inactive/missing teachers, invalid transitions and missing curriculum versions;
- auditable rollover identity, counts, exceptions and activation;
- prior-year evidence available as prerequisite/contextual evidence without automatically satisfying new-year mastery;
- mid-year membership changes represented as time-bounded historical memberships rather than overwritten class history.

Inter-school transfer remains privacy/tenant controlled: a school losing membership must not see the learner's later activity elsewhere, and a receiving school does not automatically inherit another school's institutional records.

## Sprint 19 — Public / Institutional Beta

Controlled external institutions may begin adoption only after:

- school onboarding;
- school-admin onboarding;
- teacher onboarding;
- controlled student enrollment;
- institutional account management;
- tenant isolation;
- privacy documentation;
- support processes;
- explicit academic-year/programme/curriculum-release identity;
- stable production deployment;
- repeatable school onboarding/configuration;
- structured support and issue-escalation workflow.

## Sprint 20 — Physics Grade Expansion — Physics 8–12

For each grade:

```text
current Physics subject standard
  -> applicable grade programme
      -> units
          -> outcomes
              -> skills
                  -> assessment and learning system
```

This phase should primarily require curriculum mapping, skill modelling, content development, assessment development and QA—not another architecture redesign.

## Sprint 21 — Post-MVP Subject / Grade Expansion

Select the next priority subject/grade combination after the four-subject Grade 7 MVP. Begin with:

```text
applicable subject / subject-area standard
  -> grade programme
      -> units/outcomes
          -> skills
              -> subject-appropriate assessment design
```

The objective is to prove that the standards-driven onboarding and evidence model are repeatable beyond the Grade 7 MVP bundle, across different disciplinary evidence models, item types, teacher workflows and content structures.

Architecture/navigation fixtures do not satisfy this sprint; the selected course must carry real curriculum provenance, reviewed content and an explicit release disposition.

## Sprint 22 — Multi-Subject Expansion Across Grades

Use a repeatable subject-onboarding pipeline:

1. identify official standard;
2. register standard version;
3. identify applicable grade programme;
4. map official outcomes;
5. model skills;
6. complete expert review;
7. design unit assessment blueprints;
8. build content;
9. run content/technical QA;
10. pilot;
11. production release.

The standards registry determines valid subject/grade combinations rather than assuming every subject exists in every grade.

## Sprint 23 — Cross-Grade / Cross-Subject Learner Profile

Build a longitudinal profile in which historical evidence persists across:

- academic years;
- grades;
- subjects;
- school transfers where policy permits continuity;
- curriculum versions.

Cross-grade and eventual cross-subject prerequisite relationships become structurally possible without rewriting historical learner evidence. Retention-of-learning/reassessment history can span years while remaining curriculum-version aware.

## Sprint 24 — Advanced Teacher, School & Curriculum Analytics

Add analytics only after sufficient longitudinal/multi-course evidence exists:

- class progress trends;
- engagement, usage and retention analytics with active-learning time separated from simple tab-open duration;
- baseline-diagnostic and learning-growth indicators;
- intervention groups;
- skill-gap clusters;
- misconception patterns and prerequisite-linked gap hypotheses;
- mastery evidence confidence and explicit Insufficient Evidence states;
- inspectable explanations for consequential analytics/recommendations;
- cohort progression;
- teacher-facing recommendations;
- curriculum coverage;
- official-outcome coverage;
- assessment/question quality analytics;
- standards-implementation gaps;
- school leadership reporting;
- export/reporting and authorized data portability;
- privacy-preserving benchmarking only when cohort size, privacy thresholds and statistical validity are sufficient;
- assessment-integrity/anti-gaming signals as review indicators, never automatic cheating determinations.

Analytics must respect tenant, class/course and role boundaries. Metric definitions must be governed so terms such as mastery, coverage, active learner and growth have stable, documented meanings.

## Sprint 24.5 — Teacher Assessment, Intervention & Remediation Workflows

Turn trusted evidence into teacher-controlled action:

- teacher assessment builder using validated-bank items and explicit assessment blueprints;
- intervention tracking and teacher override-with-reason while preserving raw/system evidence;
- early-warning and prioritized teacher notification workflows;
- retention-of-learning / reassessment queue;
- analytics-driven homework/remediation proposed from diagnosed gaps, prerequisite relationships and evidence confidence;
- teacher preview/edit/approve/reject/assign before automated recommendations become learner work;
- resulting practice/reassessment evidence feeds the same evidence model.

AI-generated assessment items or remediation content remain unreviewed unless explicitly approved under content governance.

## Sprint 25 — Controlled AI Layer

Implement a provider-independent AI service/model gateway so platform functions are not coupled throughout the codebase to one vendor/model. AI receives only task-relevant context and remains subordinate to curriculum, evidence, permissions and deterministic governance.

Potential uses:

- open-response feedback;
- misconception classification;
- personalized explanation generation;
- teacher-support summaries;
- language feedback;
- hint generation;
- content-authoring assistance;
- draft curriculum-mapping assistance.

Deterministic/auditable systems remain authoritative for:

- grading where rules are deterministic;
- mastery evidence;
- assessment eligibility;
- item exposure;
- curriculum identity;
- permissions;
- official progress records.

AI may propose a standards mapping, but it must not become the authority for what an official national standard says.

## Sprint 26 — National-Scale Readiness

National-scale preparation includes:

- multi-school tenancy at scale;
- regional/national administrative delegation;
- large-scale database architecture;
- high availability;
- disaster recovery;
- governance;
- curriculum-version management;
- official-source monitoring;
- curriculum-update impact analysis;
- staged curriculum rollout;
- institutional integrations;
- security at scale;
- privacy/compliance processes;
- high-volume analytics;
- operational support and escalation;
- centrally governed state-standard configuration as the default for every school;
- Master Admin-controlled approval for legitimate school-specific additions/exceptions without allowing schools to redefine the national curriculum baseline.

## Architectural invariant from Sprint 11G onward

The learner-facing shell must not assume that:

- a learner is always Grade 7;
- the platform is always Physics;
- a learner takes only one course;
- global Home owns subject-specific diagnostics, practice, assessments or mastery;
- course visibility can be inferred without an active entitlement.

## Subject-neutral core invariant from 2026-09-30 onward

The platform core must be subject-neutral. Subject-specific behavior belongs in explicit, versioned configuration or extension points.

Shared identity, tenancy, enrollment, curriculum versioning, sessions, evidence provenance, authorization, navigation and analytics must not assume a subject, grade, course code, skill/item count, response format, mastery rule, language or content model. Existing Physics-specific behavior is treated as an extension or migration concern rather than a platform default.

The complete boundary, exception rule and acceptance criteria are defined in `docs/subject-neutral-core.md`. Future subject onboarding and the Grade 7 four-subject MVP gate must verify subject isolation and prove that new subjects do not require redesign of the shared core.

## Assessment-scope invariant from Sprint 11H onward

The learning model must preserve these scope distinctions:

- Diagnostic = unit-bound learning guidance;
- Practice = skill-bound activity inside a unit;
- Mastery Check = unit-bound independent verification;
- Course Progress = aggregation of unit evidence;
- cumulative/final course assessment, if introduced, = separate explicit assessment type.

No global rule may assume every unit has 10 skills or every assessment has 20 questions.

## Curriculum-governance invariant from Sprint 11I onward

Implemented curriculum must be traceable through:

```text
official national framework
  -> applicable subject / subject-area standard
      -> grade-specific programme
          -> unit/outcome
              -> HaiEdu skill
```

Curriculum/version changes must not silently reinterpret historical evidence.

## UI invariant from Sprint 11H onward

Shared role surfaces must not assume that:

- Armenian labels fit on one line;
- flex/grid children can rely on intrinsic width without `min-width: 0`;
- button borders may hug text without internal padding;
- cards can omit explicit internal spacing when they contain generated/dynamic content;
- desktop-only width assumptions are acceptable for learner-facing actions and status text.

## Multi-tenant invariant from Sprint 14 onward

The platform must not assume that:

- one central operator manually manages every school/user;
- a school admin can see another school's data;
- a teacher role implies access to every student or subject;
- a user account automatically implies school membership;
- a class code alone is sufficient proof of institutional membership at scale;
- a school owns the learner's global identity/history;
- local school content is equivalent to centrally validated national curriculum content.

The target operating model is centrally governed canonical curriculum/content with tenant-isolated school administration, time-aware memberships and controlled enrollment.

## Final milestone structure

### Milestone A — Technical proof

**Sprints 0–2**  
The learning loop works.

### Milestone B — Coherent learning product

**Sprints 3–7**  
Students and teachers can actually use it.

### Milestone C — Pilot-ready product

**Sprints 8–10.5**  
Quality, UX, privacy, administration and production QA foundations are in place.

### Milestone D — Trustworthy, standards-aligned learning evidence

**Sprints 11–13, including Sprint 11.5**

Assessment integrity  
→ standards/source integrity  
→ curriculum versioning  
→ technical handoff readiness  
→ controlled external tester pilot  
→ calibration  
→ first standards-verified production unit.

### Milestone E — Version-aware multi-tenant academic platform

**Sprint 14**

The architecture stops being Grade-7-Physics-specific and single-institution operationally.

### Milestone F — Grade 7 four-subject MVP bundle

**Sprints 15–16.4**

Physics 7 becomes the complete reference course; Mathematics 7, Armenian Language 7 and English 7 each add a production-ready vertical slice; the four subjects pass integrated MVP readiness.

### Milestone G — Four-subject school validation and institutional readiness

**Sprints 17–19, including Sprint 18.5**

Four-subject Grade 7 school testing  
→ production/curriculum-change hardening  
→ academic-year lifecycle/rollover continuity  
→ controlled external adoption.

### Milestone H — Multi-grade Physics

**Sprint 20**

Physics expands through Grades 8–12 using applicable official programmes.

### Milestone I — Multi-grade, multi-subject expansion

**Sprints 21–23**

Next subject/grade onboarding  
→ broader standards-driven expansion  
→ longitudinal cross-grade/cross-subject learner model.

### Milestone J — Institutional intelligence and national scale

**Sprints 24–26, including Sprint 24.5**

Advanced analytics  
→ teacher assessment/intervention/remediation workflows  
→ controlled AI  
→ national-scale governance and operations.


