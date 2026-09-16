# Armenian Curriculum Mastery Platform — Sprint Roadmap

**Roadmap version:** 2.1  
**Updated:** 2026-09-16  
**Current programme status:** Sprint 11 in progress; Sprint 11F.3 production workflow smoke is active.

This file is the canonical high-level sprint sequence. `docs/backlog.md` remains the detailed implementation checklist, and sprint-specific documents contain execution evidence and acceptance notes.

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
| 11 | Assessment Integrity, Item-Bank Expansion & Closed Physics Pilot | 🟡 | 11A–11E complete. 11F.1 and 11F.2 complete. 11F.3 is in progress. |
| 12 | Learning-Model Calibration | ⏳ | Calibrate thresholds and model behavior from pilot operational evidence; thresholds remain provisional until evidence supports changes. |
| 13 | Chapter I Production Release | ⏳ | Promote Chapter I from controlled-pilot state after Sprint 11 closure and Sprint 12 disposition. |
| 14 | Multi-Grade / Multi-Subject Academic Architecture | ⏳ | Generalize curriculum, class, assignment and learner architecture without introducing one-grade/one-subject assumptions. |
| 15 | Grade 7 Physics Expansion — Chapters II–VI | ⏳ | Extend curriculum, item banks and learning workflows across the remaining Grade 7 Physics chapters. |
| 16 | Full Grade 7 Physics MVP | ⏳ | Integrate all Grade 7 Physics chapters into a coherent full-course MVP. |
| 17 | School Pilot v2 | ⏳ | Run a broader controlled school-level pilot with real teacher/student operational evidence. |
| 18 | Production Hardening | ⏳ | Address scale, performance, security hardening, observability, supportability and operational resilience. |
| 19 | Public / Institutional Beta | ⏳ | Controlled broader beta for schools/institutions after production-hardening gates. |
| 20 | Physics Grade Expansion — Physics 8–12 | ⏳ | Expand the Physics subject vertically across grades. |
| 21 | Second-Subject Implementation | ⏳ | Implement a second subject using the generalized academic architecture. |
| 22 | Multi-Subject Expansion Across Grades | ⏳ | Expand the subject catalogue across multiple grades. |
| 23 | Cross-Grade / Cross-Subject Learner Profile | ⏳ | Build longitudinal learner state that is not tied to one class, grade or subject. |
| 24 | Advanced Teacher & School Analytics | ⏳ | Add higher-level instructional, cohort and school analytics on top of validated evidence models. |
| 25 | Controlled AI Layer | ⏳ | Introduce bounded AI assistance only where deterministic, auditable core behavior is preserved. |
| 26 | National-Scale Readiness | ⏳ | Prepare governance, reliability, data architecture, operations and rollout model for national-scale use. |

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

### 11F — Closed Grade 7 Physics Chapter I pilot

**Status: 🟡 In progress.**

| Phase | Status | Evidence / next step |
|---|---:|---|
| 11F.1 Technical preflight | ✅ | Automated/source, database, active-bank, security/RLS and session-collision preflight completed. |
| 11F.2 Authenticated rendered production smoke | ✅ | Student and teacher authenticated production rendering passed where executable. Four authenticated browser-control repetitions were explicitly accepted as limitations, not PASS results. |
| 11F.3 Final production workflow smoke | 🟡 | Partially executed; details below. |
| 11F.4 Pilot privacy and participation gate | ⏳ | Required before a real controlled cohort. |
| 11F.5 Closed cohort run | ⏳ | Starts only after 11F.3 and participation gate disposition. |
| 11F.6 Evidence review / Sprint 11 closure | ⏳ | Requires pilot evidence review, critical-defect disposition and Sprint 11 pilot report. |

### 11F.3 evidence as of 2026-09-16

Completed through the live production UI:

- teacher authentication confirmed;
- disposable class `QA 11F3 E2E` created for academic year `2026-2027`;
- generated join code verified;
- student class join flow succeeded;
- product owner explicitly authorized use of the Hovhannes Vanesyan student account for the state-changing smoke, replacing the original disposable-student-only requirement for this run;
- one existing bounded Practice session was resumed and completed normally;
- Practice ended through the designed `mastery_reached` early-completion path after 5 correct responses rather than forcing all 8 planned items;
- Help/remediation UI was exercised during Practice;
- one full 20-item Chapter I Diagnostic was completed in production with 13 correct answers (65%);
- no per-item correctness feedback was observed during the Diagnostic before completion.

Current unresolved state:

- after the full Diagnostic completed, a second Diagnostic session was started during the browser-automation run and is currently active at 4/20; whether this was purely agent navigation or exposed a product-flow issue still requires disposition;
- the long Diagnostic browser run timed out at the automation layer after substantial progress, so later workflow assertions must not be inferred from that run;
- final Progress verification after the completed Diagnostic is pending;
- Mastery Check eligibility/start/resume/completion is pending;
- teacher dashboard verification of the newly generated learning evidence is pending;
- account suspension/session-revocation behavior is pending;
- privacy-preference and deletion-request flow is pending.

Sprint 11F.3 is therefore **not complete**.

## Sprint 11 closure gate

Sprint 11 may close only after all of the following are true:

1. 11F.3 final production workflow smoke is completed or each remaining item has an explicit accepted disposition.
2. Pilot privacy/participation responsibilities are defined for the real cohort.
3. A controlled Chapter I cohort completes the pilot, unless the product owner explicitly changes that exit criterion and documents the resulting limitation.
4. Repeat/exposure and item-level operational evidence are reviewed.
5. Critical defects are fixed or explicitly accepted.
6. A Sprint 11 pilot report records defects, content findings, learning-engine findings, usability observations and the disposition for Sprint 12.

## Architectural invariant from Sprint 14 onward

Do not introduce structural assumptions that:

- a learner is always Grade 7;
- the platform is always Physics;
- the only unit is `PHY7-U01`;
- a learner takes only one course;
- a learner remains in one grade permanently;
- one teacher can see every subject or every learner.

The target academic model remains curriculum-framework → subject-program → units/topics/outcomes/skills, with class membership and assignments representing delivery context rather than defining learner identity or mastery.