# Armenian Curriculum Mastery Platform — Sprint Roadmap

**Roadmap version:** 2.15  
**Updated:** 2026-09-20  
**Current programme status:** Sprint 11 is ✅ complete for technical handoff readiness. Sprint 11.5 may continue asynchronously as an external-review/pilot track, while Sprint 12A Calibration Readiness is now 🟡 in progress. Informal question-review activity remains QA/context only; Sprint 12B empirical tuning stays blocked until suitable formal learner evidence exists.

This file is the canonical high-level sprint sequence. `docs/backlog.md` remains the detailed implementation checklist, and sprint-specific documents contain execution evidence and acceptance notes.

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
| 13 | Work | Release checklist, deployment, migrations, regression and evidence reconciliation. |
| 14 | Hybrid | Multi-tenant academic architecture first in chat; bounded implementation slices in Work. |
| 15 | Hybrid | Curriculum/outcome/skill design in chat; bulk ingestion and technical QA in Work. |
| 16 | Work | Full-course integration and regression. |
| 17 | Hybrid | Pilot design and interpretation in chat; operational setup/QA/evidence handling in Work. |
| 18 | Work | Performance, observability, backups, CI/CD, security, data-integrity and curriculum-change operations. |
| 18.5 | Hybrid | Academic-year lifecycle/rollover rules in chat; lifecycle, handover and rollover implementation in Work. |
| 19 | Work | Institutional beta release, onboarding, support and operational verification. |
| 20 | Hybrid | Grade-specific curriculum modelling in chat; bulk implementation/QA in Work. |
| 21 | Hybrid | Second-subject disciplinary model in chat; generalized implementation in Work. |
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
| 11 | Assessment Integrity, Standards Integrity & Technical Handoff Readiness | ✅ | Technical handoff complete. 11F–11H are passed/dispositioned; 11L records 4/6 entry gates passed and keeps the pilot blocked on the two human Sprint 11.5 gates. |
| 11.5 | Controlled External Tester Pilot | ⏳ | Authorize and run a small real-user test cohort on the exact current release, then collect usable operational evidence for Sprint 12. |
| 12 | Learning-Model Calibration | 🟡 | 12A calibration readiness can proceed in parallel with asynchronous review; 12B empirical tuning remains blocked until suitable formal Sprint 11.5 learner evidence exists. |
| 13 | Chapter I Standards-Verified Production Release | ⏳ | Promote Chapter I as the first reference-quality production unit after standards reconciliation, pilot closure and Sprint 12 disposition. |
| 14 | Multi-Tenant, Multi-Grade / Multi-Subject Academic Architecture | ⏳ | Generalize schools, academic years, time-aware memberships, IAM/permissions, tenant isolation, audit scope, teacher continuity foundations, controlled enrollment and centrally governed content. |
| 15 | Grade 7 Physics Expansion — Chapters II–VI | ⏳ | Build remaining Physics 7 units from the current official programme through the same standards → outcomes → skills → assessment → QA pipeline. |
| 16 | Full Grade 7 Physics MVP | ⏳ | Integrate all Grade 7 Physics units with course-level progress aggregation while keeping diagnostics/mastery checks unit-bound. |
| 17 | School Pilot v2 | ⏳ | Run a broader controlled school-level pilot across the complete Physics 7 product, including progression between units and school administration workflows. |
| 18 | Production Hardening & Curriculum-Change Operations | ⏳ | Address scale, performance, security, observability, incident response, backup/restore, data-integrity checks, controlled rollout and safe curriculum-version migration/rollback. |
| 18.5 | Academic-Year Lifecycle, Rollover & Continuity | ⏳ | Implement the operational academic-year lifecycle: prepare/activate/close/archive, student progression, teacher/class handover, validated rollover and historical preservation. |
| 19 | Public / Institutional Beta | ⏳ | Controlled external beta with repeatable school onboarding, support/escalation, tenant-isolated administration, controlled enrollment and explicit curriculum-release identity. |
| 20 | Physics Grade Expansion — Physics 8–12 | ⏳ | Expand Physics vertically by mapping each grade to its applicable current programme rather than copying Physics 7 upward. |
| 21 | Second-Subject Implementation | ⏳ | Implement one genuinely different subject from its own official standard/programme and test whether the platform abstractions generalize beyond Physics. |
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

**Status: 🟡 12A calibration readiness in progress; 12B empirical calibration evidence-gated.**

Sprint 12 is split into two phases so technical preparation does not stall while informal review continues.

### 12A — Calibration Readiness

12A may run now, in parallel with asynchronous informal content/usability review. It inventories the current model, removes internal rule inconsistencies, defines the evidence contract and metrics, and builds a provenance-aware analysis pipeline.

An informal reviewer using the student-facing platform to inspect questions may generate useful content/UX QA evidence, but that activity is excluded from empirical calibration because it is deliberate review behavior rather than normal learner behavior.

The first 12A consistency defect is already identified: recent-recovery completion is hint-aware in session/mastery eligibility paths but the student dashboard currently counts hinted correct answers toward the same 4/5 recovery rule. The dashboard must be aligned with the independent-answer rule before calibration analysis.

### 12A — Hinting & Remediation v2 foundation

The Practice help layer now supports deterministic task-aware scaffolding while retaining the existing skill-level fallback. The initial v2 rollout covers all 8 parameterized Chapter I templates (80 published variants) with progressive **orient → strategy → analogous worked example** help, safe raw-parameter interpolation and richer remediation telemetry.

Diagnostic and Mastery Check remain hint-free. The learning-model thresholds and assisted-positive evidence multiplier are unchanged. Fixed/authored templates receive specific guides selectively where they add pedagogical value rather than through mechanical full-bank duplication.

See `docs/sprint-12a-hinting-remediation-v2.md`.

### 12B — Empirical Calibration

12B begins only when suitable formal Sprint 11.5 learner evidence is explicitly judged sufficient.

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

## Sprint 15 — Grade 7 Physics Expansion — Chapters II–VI

Every remaining Physics 7 unit follows the same controlled pipeline:

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

## Sprint 16 — Full Grade 7 Physics MVP

The complete Physics 7 product includes:

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

## Sprint 17 — School Pilot v2

Test the complete Physics 7 product under real classroom conditions:

- several classes;
- multiple teachers;
- school-admin workflows;
- controlled student enrollment;
- progression between units;
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

## Sprint 21 — Second-Subject Implementation

Select one subject substantially different from Physics.

The implementation begins with:

```text
applicable subject / subject-area standard
  -> grade programme
      -> units/outcomes
          -> skills
              -> subject-appropriate assessment design
```

The objective is to test whether the platform truly generalizes across different disciplinary evidence models, item types, teacher workflows and content structures.

The existing Mathematics QA fixture does not satisfy this sprint; it is architecture/navigation test data only.

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

### Milestone F — Complete standards-aligned Grade 7 Physics

**Sprints 15–16**

The first complete subject/grade product exists.

### Milestone G — Real-school validation and institutional readiness

**Sprints 17–19, including Sprint 18.5**

Full-product school testing  
→ production/curriculum-change hardening  
→ academic-year lifecycle/rollover continuity  
→ controlled external adoption.

### Milestone H — Multi-grade Physics

**Sprint 20**

Physics expands through Grades 8–12 using applicable official programmes.

### Milestone I — Genuine multi-subject platform

**Sprints 21–23**

Second subject  
→ broader standards-driven expansion  
→ longitudinal cross-grade/cross-subject learner model.

### Milestone J — Institutional intelligence and national scale

**Sprints 24–26, including Sprint 24.5**

Advanced analytics  
→ teacher assessment/intervention/remediation workflows  
→ controlled AI  
→ national-scale governance and operations.
