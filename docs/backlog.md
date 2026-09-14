# Product backlog

## Sprint 0 — Technical foundation
- [x] Repository scaffold
- [x] Initial domain model
- [x] Supabase SQL schema
- [x] Protected answer-key architecture
- [x] Deterministic grading engine
- [x] Mastery engine v0.1
- [x] Recommendation engine v0.1
- [x] Automated tests for core engine
- [x] GitHub repository created
- [x] Supabase project created
- [x] Core schema applied to Supabase
- [x] RLS baseline applied
- [x] Grade/Physics structural seed applied
- [x] `submit-answer` Edge Function deployed
- [ ] Run security/performance advisor review
- [ ] Create first authenticated test student
- [ ] Insert first validated Grade 7 Physics skill/item
- [ ] Run live answer -> attempt -> mastery integration test

## Sprint 1 — Grade 7 Physics curriculum slice
- [ ] Obtain/map current official Grade 7 Physics programme
- [ ] Identify current approved textbook used in pilot class
- [ ] Select first unit
- [ ] Map official outcomes
- [ ] Decompose 5–10 micro-skills
- [ ] Validate prerequisites with Physics SME
- [ ] Draft 20–40 deterministic items
- [ ] Teacher QA

## Sprint 2 — First live learning loop
- [ ] Student authentication UI
- [ ] Item delivery endpoint/UI
- [ ] Answer submission UI
- [ ] Attempt history
- [ ] Mastery display
- [ ] Teacher class matrix
- [ ] Small closed pilot

## Sprint 10.5 — Student Experience & Front-End Redesign
**Placement:** after Sprint 10 and before Sprint 11 Closed Physics Pilot.

**Reference direction:** IXL-inspired information architecture and interaction model, while preserving an original Armenian-platform visual identity and avoiding a pixel/brand clone.

- [ ] Create a unified authenticated application shell and navigation.
- [ ] Make the student dashboard the post-login landing page.
- [ ] Surface active session, recommended next skill, assessment status and chapter progress on Home.
- [ ] Build a Physics 7 chapter/topic/skill browser.
- [ ] Redesign practice around a focused question card and integrated three-stage remediation.
- [ ] Redesign diagnostic as a distinct assessment flow with deferred feedback.
- [ ] Redesign Mastery Check locked/ready/active/result states.
- [ ] Add a student-friendly Progress page distinguishing diagnostic, practice mastery and verified completion.
- [ ] Introduce reusable design tokens/components rather than page-specific styling.
- [ ] Complete Armenian-first responsive QA for desktop, tablet and mobile.
- [ ] Complete basic accessibility QA: keyboard, focus, contrast, labels and touch targets.
- [ ] Preserve existing deterministic grading, mastery, recommendation, session and security semantics.
- [ ] Preserve the Sprint 5 practice/remediation freeze regression fix.
- [ ] Pass CI and live student-account browser QA before Sprint 11.

Detailed scope: `docs/sprint-10-5-front-end-redesign.md`.
