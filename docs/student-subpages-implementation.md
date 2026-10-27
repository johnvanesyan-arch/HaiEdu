# Sprint 16.5B.2 — Forest student subpages

**Current delivery — 2026-10-27:** Home, all existing student subpages and complete S45 supplementary materials are deployed under 16.5B.1–B.3. See [current dashboard acceptance](student-dashboard-acceptance.md) and the [authoritative status](project-status.md). Earlier remaining-work statements below describe their dated checkpoint. Final owner usability sign-off and full four-subject 16.5C remain separate.

**27 October 2026 · Asia/Yerevan · Delivered bounded slice; full dashboard acceptance remains open.**

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
- Required CI passes on PR run [40488420737](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40488420737) and main run [40488925868](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40488925868); all five jobs succeed, with 1,456 unit/integration and 165 native-browser checks. The initial browser run caught a tablet focus-navigation specificity conflict; the desktop selector now excludes active generic players, and regression also verifies mobile suppression and width.
- Implementation merge `e7efc028d90e351270bec6606078b6867546db8c` is served on production, with all 18 changed frontend assets byte-matched. Authenticated exact-source acceptance passes 324 Physics I–VI, 154 English/preserved programme and 10 staff-analytics checks. Redacted results and queue recovery are bound in the [release record](evidence/student-subpages-release-20261027.json). The first English attempt stopped at 80/81 when a scope-denial request returned status 0 without an HTTP response; the unchanged second attempt passes all 154. These are read flows, not new learner attempt/Unit3 action acceptance.
- Previously verified, unchanged persistent Vercel blocking configuration is reused from reliability stage 1; no configuration change or fresh management readback is claimed.

## Remaining work

Existing student subpage presentation is covered by this slice. S45 supplementary materials still requires complete teacher/platform authoring, protected delivery, publication/revision/withdrawal and isolation acceptance. Future mapped features retain their owning-service dependencies. Full 16.5C and four-subject 16.4 acceptance remain open. English resumes after C47 with full Unit3 learner/audio/writing acceptance, then Units4–6; owner content/audio approvals are reused. Speaking stays classroom-assessed.
