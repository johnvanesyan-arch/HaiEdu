# Armenian Curriculum Mastery Platform — Sprint Roadmap

**Roadmap version:** 2.11  
**Updated:** 2026-09-20  
**Current programme status:** Sprint 11 is being closed as a technical handoff-readiness sprint. Sprint 11A–11E and 11I–11K are complete; 11F–11H closure QA remains open; 11L evidence classification and fail-closed pilot controls are live. Human participation authorization and the real tester cohort are explicitly deferred to Sprint 11.5 and are no longer Sprint 11 closure blockers.

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
| 18 | Work | Performance, observability, backups, CI/CD, security and curriculum-change operations. |
| 19 | Work | Institutional beta release, onboarding and operational verification. |
| 20 | Hybrid | Grade-specific curriculum modelling in chat; bulk implementation/QA in Work. |
| 21 | Hybrid | Second-subject disciplinary model in chat; generalized implementation in Work. |
| 22 | Work | Repeated standards-driven subject onboarding once the framework is stable. |
| 23 | Hybrid | Longitudinal data model in chat; cross-grade/cross-subject implementation in Work. |
| 24 | Hybrid | Metric definitions and interpretation in chat; analytics queries/dashboards in Work. |
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
| 11 | Assessment Integrity, Standards Integrity & Technical Handoff Readiness | 🟡 | 11A–11E and 11I–11K complete; 11F–11H remain partly open. 11L evidence classification and fail-closed pilot controls are live. Human participation/cohort execution is deferred to 11.5. |
| 11.5 | Controlled External Tester Pilot | ⏳ | Authorize and run a small real-user test cohort on the exact current release, then collect usable operational evidence for Sprint 12. |
| 12 | Learning-Model Calibration | ⏳ | Calibrate thresholds and model behavior only from curriculum-compatible, version-aware evidence produced in Sprint 11.5; if evidence is insufficient, document a no-change/defer disposition rather than inventing calibration. |
| 13 | Chapter I Standards-Verified Production Release | ⏳ | Promote Chapter I as the first reference-quality production unit after standards reconciliation, pilot closure and Sprint 12 disposition. |
| 14 | Multi-Tenant, Multi-Grade / Multi-Subject Academic Architecture | ⏳ | Generalize academic, institutional, authorization and enrollment architecture: schools, academic years, memberships, school admins, teacher boundaries, centrally governed content and controlled learner enrollment. |
| 15 | Grade 7 Physics Expansion — Chapters II–VI | ⏳ | Build remaining Physics 7 units from the current official programme through the same standards → outcomes → skills → assessment → QA pipeline. |
| 16 | Full Grade 7 Physics MVP | ⏳ | Integrate all Grade 7 Physics units with course-level progress aggregation while keeping diagnostics/mastery checks unit-bound. |
| 17 | School Pilot v2 | ⏳ | Run a broader controlled school-level pilot across the complete Physics 7 product, including progression between units and school administration workflows. |
| 18 | Production Hardening & Curriculum-Change Operations | ⏳ | Address scale, performance, security, observability and recovery plus safe curriculum-version migration, impact analysis and rollback operations. |
| 19 | Public / Institutional Beta | ⏳ | Controlled external beta for schools/institutions using tenant-isolated administration, controlled enrollment and explicit curriculum-release identity. |
| 20 | Physics Grade Expansion — Physics 8–12 | ⏳ | Expand Physics vertically by mapping each grade to its applicable current programme rather than copying Physics 7 upward. |
| 21 | Second-Subject Implementation | ⏳ | Implement one genuinely different subject from its own official standard/programme and test whether the platform abstractions generalize beyond Physics. |
| 22 | Multi-Subject Expansion Across Grades | ⏳ | Apply a repeatable standards-driven subject-onboarding pipeline across multiple subjects and valid grade combinations. |
| 23 | Cross-Grade / Cross-Subject Learner Profile | ⏳ | Build longitudinal, curriculum-version-aware learner state that survives grade/school changes and can support cross-grade/cross-subject prerequisites. |
| 24 | Advanced Teacher, School & Curriculum Analytics | ⏳ | Add instructional, cohort, school and standards-implementation analytics on top of validated evidence models. |
| 25 | Controlled AI Layer | ⏳ | Introduce bounded AI assistance while keeping official curriculum identity, grading, mastery evidence, permissions and progress deterministic/auditable. |
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

**Status: 🟡 In progress.**

11F now represents the technical/production readiness portion of the pilot. The real-cohort closure gate is moved to 11L so that the final cohort runs against a standards-reconciled curriculum baseline.

| Phase | Status | Evidence / next step |
|---|---:|---|
| 11F.1 Technical preflight | ✅ | Automated/source, database, active-bank, security/RLS and session-collision preflight completed. |
| 11F.2 Authenticated rendered production smoke | ✅ | Student and teacher authenticated production rendering passed where executable. Four authenticated browser-control repetitions were explicitly accepted as limitations, not PASS results. |
| 11F.3 Final production workflow smoke | 🟡 | Stale second Diagnostic dispositioned as an automation artifact; Home/Progress, Physics routing, role isolation and the legitimate Mastery-ineligible state verified. Teacher/account/privacy workflow items remain. |
| 11F.4 Pilot privacy and participation design | ⏳ | Define the privacy/participation requirements consumed by 11L. |
| 11F.5 Technical pilot-readiness report | ⏳ | Summarize technical readiness, accepted limitations and defects before standards reconciliation and real-cohort execution. |

Recent 11F.3 production work also surfaced and corrected course-entitlement, class-join verification, course-loading and authentication-state-flash defects. Teacher-side rendering of generated Diagnostic evidence has been manually verified. On 2026-09-18 the stale second Diagnostic was preserved and marked abandoned with an explicit QA disposition; Home and Progress retained the valid 13/20 result, Physics routing passed, and Mastery correctly remained closed for five unfinished skills. These checks do not by themselves close 11F.

### 11G — Multi-Subject Learner Shell Architecture Spike

**Status: 🟡 Implementation complete; Physics route QA passed; Mathematics placeholder route QA pending.**

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

Pending before Sprint 11G can be marked fully complete:

- rendered confirmation that Mathematics 7 opens only its generic placeholder and receives no Physics evidence.

See `docs/sprint-11g-multi-subject-learner-shell.md` for the detailed contract and evidence.

### 11H — Platform-wide Front-End Containment & Layout Polish

**Status: 🟡 Implementation complete; authenticated single-subject learner visual QA passed; two-subject and staff-surface visual QA pending.**

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

Pending:

- repeat the containment confirmation on the authenticated two-subject Home and Mathematics placeholder;
- quick rendered spot-check of teacher/admin/content surfaces for regressions under the shared containment rules.

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

**Status: 🟡 In progress — evidence compatibility and fail-closed pilot-entry controls live; human cohort execution deferred to Sprint 11.5.**

The first 11L slice is implemented against `physics7_u01_2026_08_14_pilot_r1`:

- created a controlled pilot-run identity bound to the exact current curriculum release;
- classified all 11 existing sessions: 10 are partially compatible legacy context and one abandoned automation artifact is incompatible;
- derived zero closure-eligible sessions, attempts or exposures;
- kept the exact-release baseline at 0 sessions, 0 attempts, 0 exposures and 0 mastery rows;
- added six entry gates and five closure gates with technical, human or shared ownership;
- added RLS-protected governance tables and security-invoker reporting views;
- added a status guard that blocks advancement to entry-ready/running/observing/closed while required gates remain open.

Current entry state: 1/6 entry gates passed and 5/6 open. Closure remains 0/5 passed.

Open before **Sprint 11 technical handoff closure**:

- finish or disposition remaining 11F teacher/account/privacy/deletion and mastery-path checks;
- complete 11G two-subject Mathematics placeholder isolation QA;
- complete 11H two-subject and staff-surface visual QA;
- preserve the 11L pilot controls in a fail-closed state with no false claim that a human cohort has run.

The following are intentionally deferred to **Sprint 11.5**: naming the operational participation-authorization owner, approving participant/guardian scope and handling, enrolling the cohort, and collecting real-user evidence. Analytics or research opt-in is not treated as operational participant/guardian authorization. No legacy evidence is counted as validation of the exact 11K release.

See `docs/sprint-11l-pilot-closure.md` and migration `0041_sprint_11l_pilot_evidence_classification.sql`.

## Sprint 11 closure gate — technical handoff readiness

Sprint 11 may close when all of the following are true:

1. 11F technical/production readiness is completed or each remaining item has an explicit accepted disposition.
2. Sprint 11G remaining route-level rendered QA is completed or explicitly dispositioned.
3. Sprint 11H post-deployment visual containment QA is completed or explicitly dispositioned.
4. 11I establishes the authoritative standards/source registry for the current implementation.
5. 11J reconciles Physics 7 Chapter I against the applicable current standard/programme.
6. 11K establishes curriculum-version/provenance rules sufficient to preserve historical interpretation and exact-release identity.
7. 11L confirms that historical evidence is classified, the exact-release pilot baseline is explicit, and pilot governance remains fail-closed until human gates are satisfied.
8. Critical technical, privacy, security, curriculum or scope defects discovered during handoff QA are fixed or explicitly accepted.
9. A **Sprint 11 technical handoff report** records implemented capability, accepted limitations, unresolved non-handoff blockers, and the exact conditions under which another person may begin testing.

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

Calibration follows Sprint 11.5 because the current mastery threshold, recovery rules and related learning-model constants remain provisional engineering assumptions.

Sprint 12 analyzes curriculum-compatible pilot behavior:

- are students classified as mastered too early or too late?
- do some skills require excessive practice?
- are items easier/harder than intended?
- does hint use distort evidence?
- are diagnostic results consistent with later performance?
- are mastery checks producing plausible outcomes?
- how often do recommendation rules send learners in the wrong direction?
- do calibration conclusions differ by curriculum version or materially changed skill definition?

Calibration evidence must be curriculum-version aware. Evidence from materially different skill definitions or blueprints must not be pooled as though it were one construct.

Where calibration settings change, model/configuration versioning should preserve the meaning of historical evidence.

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

### Time-aware identity

Learner identity persists across academic years and school changes while institutional memberships are historical, time-bounded relationships.

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
- student behavior over time.

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
- capacity testing.

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

Bad curriculum releases must be reversible without corrupting historical learner evidence.

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
- stable production deployment.

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

Cross-grade and eventual cross-subject prerequisite relationships become structurally possible without rewriting historical learner evidence.

## Sprint 24 — Advanced Teacher, School & Curriculum Analytics

Add analytics only after sufficient longitudinal/multi-course evidence exists:

- class progress trends;
- intervention groups;
- skill-gap clusters;
- cohort progression;
- teacher-facing recommendations;
- curriculum coverage;
- official-outcome coverage;
- standards-implementation gaps;
- school leadership reporting;
- export/reporting.

Analytics must respect tenant, class/course and role boundaries.

## Sprint 25 — Controlled AI Layer

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
- operational support and escalation.

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

**Sprints 17–19**

Full-product school testing  
→ production/curriculum-change hardening  
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

**Sprints 24–26**

Advanced analytics  
→ controlled AI  
→ national-scale governance and operations.
