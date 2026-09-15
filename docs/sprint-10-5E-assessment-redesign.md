# Sprint 10.5E — Assessment Hub + Diagnostic + Mastery Check

## Objective

Separate assessment from practice and from the Home dashboard so students can clearly distinguish:

- **Chapter I Diagnostic** — identifies strengths/gaps and recommends what to learn next.
- **Chapter I Mastery Check** — independently verifies performance after the required skills are strengthened.

The redesign changes presentation and routing only. Existing server-side assessment, grading, session, mastery, remediation and security rules remain authoritative.

## Implemented routes

- `assessment.html` — assessment hub and latest-result summary.
- `diagnostic.html` — dedicated 20-question Chapter I diagnostic.
- `mastery.html` — redesigned locked / ready / active / result Mastery Check.

The permanent student navigation now enables **Assessment**. Progress remains disabled until Sprint 10.5F.

## Diagnostic contract

The diagnostic is explicitly labelled **Chapter I**, never whole Grade 7.

Rules shown to the student:

- 20 questions;
- 2 questions per current Chapter I skill;
- no hints/remediation during the assessment;
- no per-item correctness feedback;
- one neutral “answer recorded” transition;
- skill-level result map after completion;
- backend recommendation becomes the next-action CTA.

The page resumes an existing diagnostic. If practice or a Mastery Check is active, it does **not** start a new diagnostic or replace the active session.

## Mastery Check contract

The redesigned Mastery Check preserves these backend states:

1. **Locked** — required skills are not yet complete.
2. **Remediation required** — a previous failed check requires practice before retry.
3. **Ready** — eligibility rules allow starting the check.
4. **Active** — independent 20-question check, no help and no per-item correctness.
5. **Passed** — Chapter I becomes verified.
6. **Failed** — result identifies remediation targets and links back to practice.

The pilot pass rule remains explicitly labelled provisional:

- overall score >= 80%; and
- at least 1 correct answer out of 2 for every skill.

## Session collision protection

Assessment pages inspect existing server-side session state before starting a new assessment.

- active Diagnostic -> resume `diagnostic.html`;
- active Practice -> return to `practice.html`;
- active Mastery Check -> resume `mastery.html`.

This prevents navigation from silently abandoning a learner’s active session.

## Home integration

Home now treats the Assessment card as a gateway to `assessment.html`.

- normal/new diagnostic actions route to `diagnostic.html`;
- active diagnostic resume routes to `diagnostic.html`;
- practice remains canonical on `practice.html`;
- mastery-specific primary recommendations may still go directly to `mastery.html`.

Legacy diagnostic markup remains inside `index.html` temporarily for regression safety, but intended Home actions are intercepted and routed to the dedicated diagnostic page. It can be removed during Sprint 10.5F cleanup after live browser QA.

## Files

New:

- `web/assessment.html`
- `web/assessment.css`
- `web/assessment.js`
- `web/assessment-task.css`
- `web/diagnostic.html`
- `web/diagnostic.js`
- `web/home-assessment-router.js`

Updated:

- `web/mastery.html`
- `web/mastery.js`
- `web/home-dashboard.js`
- `web/student-shell.js`
- test and CI configuration

## Guardrails preserved

- no answer keys in the browser;
- no service-role key in the browser;
- no help during Diagnostic or Mastery Check;
- no speed scoring or countdown pressure;
- no per-item correctness in assessments;
- no claim that the provisional mastery-check threshold is a national standard;
- no change to grading/mastery algorithms in this sprint.

## Acceptance criteria

- [x] Assessment hub separates Diagnostic and Mastery Check purposes.
- [x] Assessment navigation route enabled.
- [x] Dedicated Chapter I Diagnostic route created.
- [x] Diagnostic resumes active session and does not replace other active modes.
- [x] Diagnostic has no hints and no per-item correctness feedback.
- [x] Diagnostic completion renders a 10-skill result map and next recommendation.
- [x] Mastery Check locked / remediation / ready / active / result states redesigned.
- [x] Mastery Check blocks start while another learning mode is active.
- [x] Provisional pass rule remains visible.
- [x] Failed mastery result routes to deterministic remediation practice.
- [x] Student shell hides primary navigation only while an assessment question is active.
- [x] Existing backend assessment/security semantics preserved.
- [x] Regression tests and browser syntax checks cover the new modules.
