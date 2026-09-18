# Armenian Curriculum Mastery Platform — Sprint Roadmap

**Roadmap version:** 2.4  
**Updated:** 2026-09-18  
**Current programme status:** Sprint 11 in progress. Sprint 11A–11E are complete; 11F technical/production pilot readiness remains open; 11G multi-subject shell implementation is complete with route-level rendered QA pending; 11H platform-wide layout containment is implemented with post-deployment visual confirmation pending. New standards-governance work is now sequenced as 11I–11K, followed by 11L re-baselined pilot closure before Sprint 12 calibration.

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
| 11 | Assessment Integrity, Standards Integrity & Closed Physics Pilot | 🟡 | 11A–11E complete; 11F–11H remain partly open; 11I–11K establish standards provenance/versioning; 11L closes the pilot on a reconciled curriculum baseline. |
| 12 | Learning-Model Calibration | ⏳ | Calibrate thresholds and model behavior only from curriculum-compatible, version-aware pilot evidence. |
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
| 11F.3 Final production workflow smoke | 🟡 | Substantially executed; remaining workflow/security/privacy items still require disposition. |
| 11F.4 Pilot privacy and participation design | ⏳ | Define the privacy/participation requirements consumed by 11L. |
| 11F.5 Technical pilot-readiness report | ⏳ | Summarize technical readiness, accepted limitations and defects before standards reconciliation and real-cohort execution. |

Recent 11F.3 production work also surfaced and corrected course-entitlement, class-join verification, course-loading and authentication-state-flash defects. Teacher-side rendering of generated Diagnostic evidence has been manually verified. These corrections do not by themselves close 11F.

### 11G — Multi-Subject Learner Shell Architecture Spike

**Status: 🟡 Implementation complete; route-level authenticated rendered QA pending.**

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

Pending before Sprint 11G can be marked fully complete:

- rendered confirmation that Physics 7 continues to open normally from the new shell;
- rendered confirmation that Mathematics 7 opens only its generic placeholder and receives no Physics evidence.

See `docs/sprint-11g-multi-subject-learner-shell.md` for the detailed contract and evidence.

### 11H — Platform-wide Front-End Containment & Layout Polish

**Status: 🟡 Implementation complete; post-deployment authenticated visual confirmation pending.**

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

Pending:

- reload the authenticated production UI and confirm the reported Home/card/button defects are visually resolved;
- quick rendered spot-check of teacher/admin/content surfaces for regressions under the shared containment rules.

See `docs/sprint-11h-frontend-containment-polish.md` and `docs/assessment-scope-model.md`.

### 11I — National Standards Baseline & Source Registry

**Status: ⏳ Planned.**

Purpose: establish the authoritative curriculum-source hierarchy before calibration or multi-subject expansion.

Canonical hierarchy:

```text
National General Education State Standard
  -> Subject / Subject-Area Standard
      -> Grade-Specific Programme
          -> Units / Themes
              -> Official Learning Outcomes
                  -> HaiEdu Skills
```

Required work:

- register the current overarching national standard;
- register applicable subject/subject-area standards;
- register grade-specific programmes and applicability by grade;
- record issuing authority, legal/order identifier, source URL, approval/effective dates where available, revision status and supersession relationships;
- create a subject-standard applicability matrix;
- distinguish authoritative curriculum sources from textbooks and supplementary references;
- establish a source-review procedure so future curriculum changes are not handled ad hoc.

Exit criterion:

- the platform team can answer, from the registry, which official standard/programme governs any implemented subject-grade combination and which version a curriculum release was built against.

### 11J — Physics 7 Current-Standard Reconciliation

**Status: ⏳ Planned.**

Purpose: re-audit the existing Physics 7 Chapter I architecture against the currently applicable official framework, Physics subject standard and Grade 7 programme before treating Chapter I as a reference implementation.

Crosswalk:

```text
current national framework
  -> current Physics subject standard
      -> Physics 7 programme
          -> official outcome
              -> HaiEdu learning outcome / micro-skill
                  -> items and assessment blueprint
```

For every existing skill/outcome/item family, record one of:

- unchanged;
- mapping updated;
- wording updated;
- scope changed;
- merge required;
- split required;
- no longer applicable;
- new official outcome missing.

Rules:

- do not destroy learner history merely because a standard changes;
- retain stable identifiers where semantics are unchanged;
- create a new curriculum version or mapping when meaning changes materially;
- platform-derived micro-skills are allowed only when traceably supportive of an official outcome.

Exit criterion:

- every Chapter I skill and assessment family is traceable to the current Physics 7 programme or explicitly documented as a justified derived micro-skill.

### 11K — Curriculum Versioning, Provenance & Release Gates

**Status: ⏳ Planned.**

Purpose: make standards provenance and curriculum change history first-class platform architecture.

Required capabilities:

- version identity for curriculum frameworks, subject standards and subject programmes;
- normative-source metadata such as authority, document identifier, version, effective dates, source URL and supersession relationships;
- curriculum-release identity for implemented subject programmes/units;
- learner sessions and assessment results resolvable to the curriculum release/blueprint under which they occurred;
- item/outcome/skill mappings that remain historically interpretable after curriculum updates;
- content-admin provenance visibility;
- production release gates requiring official programme identification, source/version registration, outcome mapping, skill mapping, assessment scoping and content QA.

Invariant:

> A curriculum update must create an auditable new version/release when semantics change; it must never silently reinterpret historical learner evidence.

### 11L — Re-baselined Chapter I Pilot Closure

**Status: ⏳ Planned.**

Purpose: complete the real Chapter I pilot only after 11I–11K establish what curriculum version the pilot is actually validating.

Before the cohort run, classify existing pilot evidence as:

- compatible with the reconciled curriculum;
- partially compatible;
- incompatible.

Compatible evidence may be retained. Materially changed skills/items/assessment blueprints require new evidence.

Required work:

- close remaining 11F technical-readiness items or explicitly disposition them;
- complete 11G route-level QA and 11H visual confirmation or explicitly disposition them;
- execute the privacy/participation gate;
- run the controlled real cohort;
- observe diagnostic → practice → mastery workflow;
- collect teacher observations and usability findings;
- review item exposure/repetition evidence;
- review standards-alignment defects alongside technical/content defects;
- produce the Sprint 11 pilot report.

## Sprint 11 closure gate

Sprint 11 may close only after all of the following are true:

1. 11F technical/production readiness is completed or each remaining item has an explicit accepted disposition.
2. Sprint 11G remaining route-level rendered QA is completed or explicitly dispositioned.
3. Sprint 11H post-deployment visual containment check is completed or explicitly dispositioned.
4. 11I establishes the authoritative standards/source registry for the current implementation.
5. 11J reconciles Physics 7 Chapter I against the applicable current standard/programme.
6. 11K establishes curriculum-version/provenance rules sufficient to interpret pilot evidence historically.
7. 11L executes the privacy/participation gate and controlled Chapter I cohort unless the product owner explicitly changes that exit criterion and documents the limitation.
8. Repeat/exposure, item-level, usability and standards-alignment evidence are reviewed.
9. Critical defects are fixed or explicitly accepted.
10. A Sprint 11 pilot report records technical, content, curriculum, learning-engine and usability findings and the disposition for Sprint 12.

## Sprint 12 — Learning-Model Calibration

Calibration remains immediately after Sprint 11 because the current mastery threshold, recovery rules and related learning-model constants remain provisional engineering assumptions.

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

**Sprints 11–13**

Assessment integrity  
→ standards/source integrity  
→ curriculum versioning  
→ real pilot  
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
