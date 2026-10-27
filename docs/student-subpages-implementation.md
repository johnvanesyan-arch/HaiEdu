# Sprint 16.5B.2 — Forest student subpages

**27 October 2026 · Asia/Yerevan · Implementation complete; release checks pending.**

John requests the next course/assessment/progress redesign and explicitly includes all associated student subpages. The approved style guide and 45-entry capability map remain the contract. This shared-core presentation slice introduces no curriculum, content, backend, scoring, replay, entitlement or release-policy change.

## Complete route audit

| Surface | Routes / consumers | Implemented presentation / preservation |
| --- | --- | --- |
| Home, Courses, My work | `index.html`, existing contextual views | Retained B.1 continuation/navigation; Forest stylesheet now statically discoverable and loaded last. |
| Shared course | `course.html?tab=course` | Visual heading, mode icons, rules disclosures, exact selected context and skill evidence; all existing deep links remain. |
| Shared assessments | `course.html?tab=assessment` | Same authoritative availability, attempt counts and thresholds; rules expanded initially and keyboard-collapsible. No decorative action starts a session. |
| Shared progress/history | `course.html?tab=progress` | Required-skill readiness numerator/denominator only when all required states are known. Evidence bars preserve raw returned values. No inferred mastery or cross-subject aggregate. Original history/provenance stays accessible. |
| Focused generic task | `course.html?action=…`, all registered response types | Reading/listening, choice, typed, matching/ordering controls, rules, help/feedback and completion use scoped styles. Competing browsing overview is hidden during a player; course navigation stays available. No source, draft, replay or scoring contract changes. |
| Existing direct routes | `physics-7.html`, `assessment.html`, `progress.html`, `practice.html`, `diagnostic.html`, `mastery.html`; embedded Home task/result | Same Forest controls, cards, progress, results and mobile typography; registered legacy extension remains isolated. |
| Guides | `course.html?tab=guides` | Visual heading, native disclosure, readable passages and examples; diagnostic/assessment-active gates unchanged. |
| Writing and feedback | `course.html?tab=writing`, shared `written-work.mjs` | List, draft editor, save/submit, rubric/history and lavender teacher-feedback panels. All unsaved-change/version/marking controls retained; teacher workspace CSS unchanged. |
| Account/privacy | `privacy.html` | Student role alone receives Forest styling and section links. Security, preferences, data inventory and deletion confirmations preserved. Signout stays visible on narrow screens. Staff account view retains its existing styling. |
| Join | `join.html` | Clear code card, strong labelled input and responsive actions; existing verification and single-use code logic unchanged. |
| Shared identity gateway | `account-access.html` / existing clean URL | Forest form/brand treatment covers login, registration, invitation, recovery and password entry. Layout and routing stay shared for every role; staff dashboards remain unchanged. |

The new CSS is scoped to `data-haiedu-student`. Static references cover stylesheet order; the four narrow Physics QA workflows and staff-analytics workflow include all new dependencies. The common identity gateway is intentionally shared presentation, not a student-only authentication implementation. The hidden historical Home renderer remains previously recorded migration debt.

## Evidence and limits

- Syntax of all 72 browser modules, TypeScript, five core mirrors, favicon coverage and all nine browser QA dependency graphs pass.
- The first full local unit run passed 1,453/1,454. One old source-text assertion expected readiness rendering to remain inline; it now checks the extracted renderer's actual false/unknown/missing behavior. Its focused rerun and the two new semantic presentation checks pass. Required CI reruns the full suite.
- Native cloud Chromium preview uses actual browser modules with synthetic read/auth services, never production identities or content. Course, assessment, progress, guides, focused player, writing list, account, join and registration were checked at iframe widths 320/360/768/1280; no horizontal overflow or clipped action controls after stylesheet-order correction. These checks do not establish actual-device or full WCAG certification.
- Native CI expands existing complete-route coverage to 320 px, adds guide/writing/rubric/teacher-feedback and focused-player checks, and adds shared identity/account/join checks plus staff-theme/signout preservation. Existing audio, response, draft, concurrency and role suites remain required.
- [Course screenshot](evidence/haiedu-student-course-20261027.jpg) shows synthetic data, not real learner records.
- Required CI, main release and authenticated exact-source production acceptance are pending; the final delivery record must identify the commits/runs. Previously verified, unchanged persistent Vercel blocking configuration is reused from reliability stage 1; no configuration change or fresh management readback is claimed.

## Remaining work

Existing student subpage presentation is covered by this slice. S45 supplementary materials still requires complete teacher/platform authoring, protected delivery, publication/revision/withdrawal and isolation acceptance. Future mapped features retain their owning-service dependencies. Full 16.5C and four-subject 16.4 acceptance remain open. English resumes after C47 with full Unit3 learner/audio/writing acceptance, then Units4–6; owner content/audio approvals are reused. Speaking stays classroom-assessed.
