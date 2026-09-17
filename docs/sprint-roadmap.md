# Armenian Curriculum Mastery Platform — Sprint Roadmap

**Roadmap version:** 2.2  
**Updated:** 2026-09-17  
**Current programme status:** Sprint 11 in progress; Sprint 11F final pilot workflow remains open and Sprint 11G multi-subject learner-shell implementation is complete with authenticated rendered QA pending.

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
| 11 | Assessment Integrity, Item-Bank Expansion & Closed Physics Pilot | 🟡 | 11A–11E complete. 11F remains open. 11G was added to prevent further one-subject learner-shell assumptions before pilot/product work continues. |
| 12 | Learning-Model Calibration | ⏳ | Calibrate thresholds and model behavior from pilot operational evidence; thresholds remain provisional until evidence supports changes. |
| 13 | Chapter I Production Release | ⏳ | Promote Chapter I from controlled-pilot state after Sprint 11 closure and Sprint 12 disposition. |
| 14 | Multi-Grade / Multi-Subject Academic Architecture | ⏳ | Generalize curriculum, class, assignment and learner architecture without introducing one-grade/one-subject assumptions. Sprint 11G provides only the learner-shell containment contract, not this full generalization. |
| 15 | Grade 7 Physics Expansion — Chapters II–VI | ⏳ | Extend curriculum, item banks and learning workflows across the remaining Grade 7 Physics chapters. |
| 16 | Full Grade 7 Physics MVP | ⏳ | Integrate all Grade 7 Physics chapters into a coherent full-course MVP. |
| 17 | School Pilot v2 | ⏳ | Run a broader controlled school-level pilot with real teacher/student operational evidence. |
| 18 | Production Hardening | ⏳ | Address scale, performance, security hardening, observability, supportability and operational resilience. |
| 19 | Public / Institutional Beta | ⏳ | Controlled broader beta for schools/institutions after production-hardening gates. |
| 20 | Physics Grade Expansion — Physics 8–12 | ⏳ | Expand the Physics subject vertically across grades. |
| 21 | Second-Subject Implementation | ⏳ | Implement a real second subject using the generalized academic architecture; the Sprint 11G Mathematics fixture is not production curriculum. |
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
| 11F.3 Final production workflow smoke | 🟡 | Substantially executed; remaining workflow/security/privacy items still require disposition. |
| 11F.4 Pilot privacy and participation gate | ⏳ | Required before a real controlled cohort. |
| 11F.5 Closed cohort run | ⏳ | Starts only after 11F.3 and participation gate disposition. |
| 11F.6 Evidence review / Sprint 11 closure | ⏳ | Requires pilot evidence review, critical-defect disposition and Sprint 11 pilot report. |

Recent 11F.3 production work also surfaced and corrected course-entitlement, class-join verification, course-loading and authentication-state-flash defects. Teacher-side rendering of generated Diagnostic evidence has been manually verified. These corrections do not by themselves close 11F.3.

### 11G — Multi-Subject Learner Shell Architecture Spike

**Status: 🟡 Implementation complete; authenticated rendered QA pending.**

Sprint 11G was inserted before Sprint 12 because the global learner Home and navigation still structurally assumed one subject. Continuing with that assumption would make later multi-subject expansion unnecessarily expensive.

Implemented:

- global Home now has a cross-subject information hierarchy rather than exposing a full Physics-only dashboard as the primary learner Home;
- learner navigation is generated from actual active class/course entitlements;
- subject cards are grouped by `courseKey` (`subject + grade`);
- Physics 7 keeps its existing subject-specific course, assessment and progress routes;
- a generic entitled-course workspace exists for subjects whose learning module is not yet implemented;
- a draft Grade 7 Mathematics QA fixture and class were added solely to create a real two-subject learner state;
- `bestenglishac@gmail.com` has active Grade 7 Physics and Grade 7 Mathematics QA memberships for this architecture test;
- regression tests pass on the implemented head and Vercel deployment reports success.

Pending before Sprint 11G can be marked fully complete:

- authenticated rendered production QA of the two-subject Home;
- rendered confirmation that Physics 7 continues to open normally from the new shell;
- rendered confirmation that Mathematics 7 opens only its generic placeholder and receives no Physics evidence.

The connected browser automation context currently has no usable saved student credentials/session, so those rendered checks remain pending rather than being marked PASS.

See `docs/sprint-11g-multi-subject-learner-shell.md` for the detailed contract and evidence.

## Sprint 11 closure gate

Sprint 11 may close only after all of the following are true:

1. 11F.3 final production workflow smoke is completed or each remaining item has an explicit accepted disposition.
2. Sprint 11G rendered multi-subject QA is completed or explicitly dispositioned.
3. Pilot privacy/participation responsibilities are defined for the real cohort.
4. A controlled Chapter I cohort completes the pilot, unless the product owner explicitly changes that exit criterion and documents the resulting limitation.
5. Repeat/exposure and item-level operational evidence are reviewed.
6. Critical defects are fixed or explicitly accepted.
7. A Sprint 11 pilot report records defects, content findings, learning-engine findings, usability observations and the disposition for Sprint 12.

## Architectural invariant from Sprint 11G onward

The learner-facing shell must not assume that:

- a learner is always Grade 7;
- the platform is always Physics;
- a learner takes only one course;
- global Home owns subject-specific diagnostics, practice, assessments or mastery;
- course visibility can be inferred without an active entitlement.

## Architectural invariant from Sprint 14 onward

Do not introduce structural assumptions that:

- a learner is always Grade 7;
- the platform is always Physics;
- the only unit is `PHY7-U01`;
- a learner takes only one course;
- a learner remains in one grade permanently;
- one teacher can see every subject or every learner.

The target academic model remains curriculum-framework → subject-program → units/topics/outcomes/skills, with class membership and assignments representing delivery context rather than defining learner identity or mastery.
