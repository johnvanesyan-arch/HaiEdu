# Sprint 11G — Multi-Subject Learner Shell Architecture Spike

**Status:** 🟡 Implementation/QA in progress  
**Introduced:** 2026-09-17  
**Reason:** the student Home and navigation were still structurally centered on Physics 7. Before further pilot/product work, the learner shell needs to demonstrate that multiple enrolled subjects remain separate and understandable.

## Goal

Establish the minimum architecture and UI contract for a learner who is enrolled in more than one subject without pulling the full Sprint 14 multi-grade/multi-subject generalization forward.

The global learner Home must summarize across courses. Detailed diagnostic, practice, assessment, mastery and progress workflows remain inside their subject/course context.

## Architectural contract

### Global learner level

The student shell owns:

- `Գլխավոր` / Home;
- `Իմ առարկաները` / actual enrolled course list derived from active class memberships;
- cross-subject next-action summary;
- compact subject cards;
- cross-subject attention signals when supported;
- join-class and account/privacy utilities.

The global Home must not assume that the learner is always in Physics 7.

### Subject/course level

A subject workspace owns:

- subject overview;
- units/topics;
- practice;
- diagnostics/assessments/mastery checks;
- subject progress.

Physics 7 remains the first fully implemented subject workspace. Other enrolled courses must be able to exist safely without inheriting Physics data or actions.

## Scope

1. Derive learner course navigation from `class_memberships -> classes -> subject + grade` entitlements.
2. Replace the Physics-centric global Home presentation with a cross-subject Home shell.
3. Keep Physics 7 learning behavior intact behind its subject workspace.
4. Add one deliberately minimal Grade 7 Mathematics QA fixture to force a real two-subject learner state.
5. Add a generic subject workspace shell for an entitled subject whose learning module is not implemented yet.
6. Ensure an unrelated subject never receives Physics diagnostic/progress/mastery data.
7. Preserve direct authorization gates: UI navigation is presentation; server-side entitlement remains authoritative.
8. Add regression coverage for the new shell contract.

## Explicit non-goals

This sprint does **not**:

- build the Grade 7 Mathematics curriculum;
- create Mathematics diagnostics, practice, mastery checks or item banks;
- generalize teacher class creation to every subject;
- replace Sprint 14;
- define the final national subject catalogue;
- calibrate cross-subject recommendation ranking.

The Mathematics fixture is architecture QA data, not production curriculum.

## QA fixture

Production QA fixture used for this spike:

- subject: `mathematics` / `Մաթեմատիկա` — `draft`;
- Grade 7 subject program — `draft`;
- placeholder unit: `MATH7-QA-U01` — `draft`;
- class: `QA 11G Math 7`;
- academic year: `2026-2027`;
- join code: `MATH7QA1`;
- QA student: `bestenglishac@gmail.com`;
- existing Physics 7 enrollment on the same QA student remains available so the Home can be tested with two simultaneous subjects.

## Acceptance criteria

- [x] Global Home no longer visually exposes the full Physics-only dashboard as the primary learner Home.
- [x] Home renders one subject card per distinct entitled subject/grade pair.
- [x] Desktop navigation is generated from actual learner course entitlements.
- [x] Mobile navigation scales through Home/Subjects plus current-course context instead of listing every subject workflow globally.
- [x] Physics 7 keeps its existing subject-specific routes for course, assessment and progress.
- [x] A non-Physics entitled course opens a generic course workspace rather than Physics content.
- [x] A student with no classes still receives the join-class empty state.
- [x] Course entitlement remains based on active class membership.
- [x] Mathematics QA fixture is isolated from the Physics learning engine.
- [ ] CI regression suite passes on final Sprint 11G head.
- [ ] Rendered production QA confirms the two-subject Home for the QA student.
- [ ] Rendered production QA confirms Physics 7 still opens normally from the new shell.
- [ ] Rendered production QA confirms Mathematics 7 opens only the generic placeholder workspace and does not show Physics evidence.

## Home information hierarchy

The global Home contract established by this spike is:

1. **Next recommended action** — one primary action, explicitly labeled by subject.
2. **My subjects** — one compact card per enrolled subject/grade.
3. **Needs attention** — bounded cross-subject attention signals when the subject engine provides them.
4. Subject-specific detail remains behind the subject card/workspace.

Future subjects may add assessment/recommendation providers to this global layer, but they must do so through subject-scoped evidence rather than global hardcoded assumptions.

## Relationship to later sprints

Sprint 11G is a containment spike. Sprint 14 remains responsible for full multi-grade/multi-subject academic architecture, generalized assignments/course catalog behavior, and eliminating remaining single-course assumptions across backend learning functions.
