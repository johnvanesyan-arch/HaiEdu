# Shared Forest staff layout and teacher prototype

2026-10-28 · Sprint 16.5B.9 · DESIGN-01 · owner-approved direction

The staff workspaces now share the accepted Forest/cream palette and Armenian typography. The existing role-specific homes, teaching assignments, review services and administration controls remain authoritative. This slice changes presentation and provides a concrete teacher specimen; it does not implement the cross-class Today queue or new feedback persistence.

## Shared foundation

`web/forest-tokens.css` is the common source for the existing student palette and the staff palette. Student token aliases resolve to their previously accepted values. The pinned, unmodified OFL Armenian font is reused. `web/staff-forest.css` applies the staff skin through role-neutral attributes, independently of learner authorization. The shared account still starts with the B.5 neutral loading state and resolves its role from the authenticated account response; staff never receive a student role or student shell because their colours now match.

Common presentation covers natural Armenian typography, cream canvas, Forest actions, white cards, control borders, brown focus rings, labelled semantic states, compact page headings and breadcrumbs. Account and logout remain visible on compact screens. The shared logout delegates to the existing page controller; navigation is not an authorization mechanism. Teacher Home selection no longer also selects the external resource-library link.

| Consumer | Coverage |
| --- | --- |
| Teacher | Home, profile, create, active classes, class detail, folded archive; existing resource/assignment/writing entry points and review mount |
| School admin | Overview, years, teachers, invitations, pending accounts, teacher detail and master-admin branch |
| Master admin | Overview, schools, accounts, archive, deletion requests, audit and MFA/security page |
| Reviewer/content | Home, queue, bank, item editor, curriculum, operational evidence, unit materials, guides and misconceptions |
| Shared account | Neutral pending/error, role-resolved staff/student, signout and stale-response boundaries |
| Shared resources/writing | Existing resource authoring/assignment controls and teacher review; learner colours retained through equivalent token aliases |

The logo keeps its approved blue/gold colours. Evidence bands, readiness, verified mastery, QA, human marking and account states remain distinct records. Matching colours do not merge their meanings.

## Reviewable teacher specimen

[Open the prototype](https://www.haiedu.am/teacher-workspace-preview.html), also linked as «Նոր տեսքի նախադիտում» in the teacher navigation footer. The specimen is reviewable before broader Today/feedback implementation. It uses realistic but explicitly fictional Armenian classes and work, the existing subject-code artwork with generic fallback, and the shared staff foundation.

The Home → Classes → Review journey supports choosing a class, opening work, viewing example criteria, entering a local feedback example and trying a local confirmation. The scenario picker exposes ready, loading, empty, error/retry and folded archived states. Three subjects/grades illustrate the layout, not curriculum activation. Queue counts are explicitly for the selected fictional class.

The public specimen has no authentication, service calls, analytics, browser storage or learner mutations. Confirmation changes only the current page's fictional queue, announces that nothing was sent and resets on reload. It does not promise teacher feedback autosave, reusable comments, live aggregate queues or new writing-task creation. The real teacher writing workflow and SOP are unchanged.

## Verification and release boundary

| Evidence | Result |
| --- | --- |
| Implementation [PR333](https://github.com/johnvanesyan-arch/HaiEdu/pull/333), [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40720706638) and [main CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40721519807) | All five required jobs; 1,488 unit/integration and 234 native browser checks |
| Acceptance adapter [PR334](https://github.com/johnvanesyan-arch/HaiEdu/pull/334), [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40723829460) and [main CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40724576801) | All five required jobs; same test totals; no runtime change |
| Guarded [staff acceptance](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40725434252) on `3883777a853c68e6e678ae3d4b48ccd4d40b4521` | 147/147, both schools, role-scoped class lifecycle and UI, 54 before + 54 after isolation, four run-created classes archived and two temporary memberships ended |
| [English compatibility](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40721519571), [preserved-programme compatibility](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40721519890) | 154/154 and 123/123 read checks on the implementation; no learning writes |
| Production source | All 21 changed frontend files match the merged implementation; no frontend change after the accepted source |


Native Chromium coverage uses the real HTML/CSS/role shell for fourteen staff pages and simulated authorization outcomes, plus the existing synthetic-service teacher journey. It checks 360/768/1280 px, 200% text, keyboard access, visible account/logout, correct breadcrumbs and one logout delegation. Prototype coverage exercises all views/states, retry, local confirmation/reset and reduced motion. Existing account tests cover neutral loading, staff/student roles, signout, account switching and stale responses. Existing PGlite/browser writing and resource tests remain the service regressions; offline layout tests are not signed-in production acceptance.

The prototype and affected role screenshots are reviewed before broad rollout. Required CI, all five aggregate release jobs, production source parity and fresh staff action acceptance are recorded in the [release evidence](evidence/forest-staff-release-20261028.json). Unchanged learning/content/audio and assignment backend evidence is reused explicitly. No database, Edge Function, grant, storage, scoring or curriculum change is included.

## Next boundaries

16.5B.10 adds the scoped, paginated Today queue projection and visual live class cards, with explicit unknown/partial/error states and no per-class fan-out. 16.5B.11 covers teacher feedback persistence/snippets and their conflict/retry contracts. PERF-02 and DEMO-01 remain open. No new production timing claim is made in B.9; B.7 on-demand requests are preserved, and the shared-font first-load cost and remaining budgets belong in B.10/B.12 measurement. WRITE-CREATE and RESOURCE-SUBMIT remain separate additional capabilities. Final owner usability acceptance remains B.12; all 45 capability mappings, English C47 pause and the full four-subject gates remain.

## Acceptance queue operation

The existing shared fixture group retains one active and one pending run. Broad script triggers can replace a pending staff run before any job starts. The normal GitHub **Run workflow** control dispatched the existing main-only staff workflow directly on reviewed `3883777a853c68e6e678ae3d4b48ccd4d40b4521`, avoiding another scheduling commit. Keep source, designated-fixture, authorization, non-cancelling concurrency and run-owned cleanup guards. The acceptance adapter uses the shared Home navigation now that the duplicate header is hidden. This is an operator path, not a new product capability.
