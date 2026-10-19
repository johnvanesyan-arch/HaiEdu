# Armenian Curriculum Mastery Platform


A multi-subject supplementary learning platform aligned to Armenia's general education system. Physics, Mathematics, Armenian Language, English and future subjects have equal platform status and use the same subject-neutral core. The currently implemented course-content milestone is Grade 7 Physics; that delivery status gives Physics no architectural or product priority.

## Project status

Start with the [authoritative status register](docs/project-status.md) for current delivery stages, dated inventories and unresolved gates. The [roadmap](docs/sprint-roadmap.md) defines sequence, the [backlog](docs/backlog.md) tracks implementation checklists, and the [API contract](docs/api-contract.md) describes the current session workflow and legacy boundaries. Notion is a secondary summary; check its source-commit stamp before relying on its copy. Synchronization to this change follows merge and requires readback verification.

Chapter II has 192 approved questions, 263 active definitions and 57 published guides. Its owner-authorized [provisional pilot](docs/chapter-ii-pilot-release.md) is active: both reviewed migrations, production rollback rehearsal, exact forms and model/policy bindings are verified. All 53 preservation checks passed; Chapter I remains on its original pilot. Authenticated desktop/mobile chapter-switching acceptance passed 91/91. Independent specialist review and final historical-exposure disposition remain required for production promotion. Chapter III is also active as the provisional pilot described below. [Activation evidence](docs/evidence/chapter-ii-pilot-activation-20261013.json) · [Authoritative status](docs/project-status.md).

**Sprint 15C.26 technical scope complete: Chapter III is active as the owner-authorized provisional pilot.** All 168 approved questions, 80 published guides and 344 active definitions are unchanged. Exact activation/readback verified 510 configuration rows, four v2 policy contracts and five forms; rollback and commit passed all 61 preservation scopes. Authenticated production acceptance passed **123/123**, including Home → Chapter I at 1365 px and Chapter I → II → III → I at 390 px, with two-school isolation **54/54**. All 59 tracked public table fingerprints remained unchanged after activation through acceptance. Chapters I/II and learner history are preserved. Independent specialist review, final exposure disposition and production promotion remain open. [Release and evidence](docs/chapter-iii-pilot-release.md).

**Sprint 15D.6 — Chapter IV knowledge-only provisional pilot activated:** John approved the exact contract and five revisions on 2026-10-18. All five v2 revisions passed saved-content QA and ordinary delegated approval through the signed-in reviewer UI; all 236 current questions are approved. Diagnostic 19, Practice 8, Mastery 15 (12/15 plus one correct in each of ten required skills), and Review 12 are active. The five forms contain 83 disjoint questions; 15 other Mastery items remain held outside the pools. Rollback restored all 59 table fingerprints; activation and exact 677-row readback passed 61 preservation scopes. Chapters I–III, learner records and numerical readiness parameters are preserved. Authenticated production acceptance passed **155/155**, plus two-school isolation **54/54**, on exact frontend `230925d0271bfaf55fc2973731650fe38ffeb99a`. Home → I at 1365 px, then I → II → III → IV → I at 390 px passed for both schools without page errors or attempted learning mutations. All 59 tracked public tables remain unchanged through acceptance. Specialist/exposure review is deferred; performed density/Hooke experiments remain unassessed. [Release evidence](docs/chapter-iv-pilot-release.md).

**Sprint 15E.4 — Chapter V planned bank draft-complete; ordinary review pending:** Batch 3 and the five substantively reworked held proposals add **49 questions (28 Practice / 9 Diagnostic / 12 Mastery), 28 guides and 25 definitions**. Chapter V now has **152 draft questions (88 Practice / 24 Diagnostic / 40 Mastery), 88 draft guides and 108 draft definitions**. All planned slots are filled; no held proposals remain from the authorized batches. Saved-content technical checks passed 49/49 questions and 28/28 guides. Previous content, approvals, learner records and releases are preserved. Ordinary review, specialist/exposure qualification, the assessment/practical contract, allocation and Chapter V release remain open. [Batch 3 evidence](docs/chapter-v-batch-03-comparison.md).

## Chapter I implemented baseline

The project now has a working Chapter I learning-engine slice for:

**Grade 7 Physics → Chapter I: Բնության ուսումնասիրության ֆիզիկական մեթոդները**

The Chapter I release baseline contains:

- 1 Grade 7 Physics Chapter I unit
- 5 topics
- 6 exact current official programme outcomes: 5 mandatory and 1 additional
- 10 standards-reconciled micro-skills, still in `review` pending external Physics SME approval
- 9 prerequisite links
- 77 registered item families
- 260 current non-retired variants, including 240 active pilot-eligible variants
- active capacity of 120 Practice, 40 Diagnostic and 80 protected Mastery variants
- an exact pilot curriculum release with immutable outcome/skill/family snapshots and 40/120/80 frozen assessment blueprints
- explicit legacy provenance for all evidence created before curriculum-release identity existed
- an auditable framework → subject standard → programme → official outcome → skill → item-family reconciliation

The micro-skill graph covers physical phenomena; body/material/phenomenon distinctions; physicists; observation vs experiment; scientific inquiry; quantities/units/instruments; unit conversion; instrument scales; measurement error/precision; and integrated measurement investigations.

All active variants have completed internal content review and are pilot-eligible. `provisional_no_sme_review` remains explicit because internal review and current-standard reconciliation do not substitute for external Physics SME approval.

## Working learning loop

The backend implements:

`authenticated student -> start/resume a learning session -> session-bound item delivery and exposure record -> student answer -> deterministic grading -> attempt record -> mastery update -> prerequisite diagnosis -> recommendation`

The live student-facing learning loop uses these JWT-protected Supabase Edge Functions:

1. `start-learning-session` — start or resume a bounded learning session under the existing student, course-access and curriculum-release checks.
2. `get-session-item` — retrieve an item for that session with session-bound exposure provenance.
3. `submit-answer` — submit the session-bound response for server-side grading and evidence updates; Mastery uses `submit-mastery-answer`.

Governed contexts select an authorized enrollment/release/unit and use a published assessment policy. Existing Chapter I clients retain the registered legacy adapter. Current governed scoring supports single choice and true/false; numeric/quantity support belongs to the legacy path. See the [API contract](docs/api-contract.md) for request fields, deferred assessment responses, persisted option presentation, server-owned help and duplicate handling.

`get-practice-item` is retired. Authenticated POST requests that pass its existing live-session checks receive **HTTP 410 Gone** (`legacy_practice_delivery_retired`), with `start-learning-session + get-session-item` as the replacement. It no longer serves assessable content; unauthenticated or inactive-session requests still receive their existing authorization errors.

The scheduler avoids the learner's most recent items, considers prerequisite mastery, and selects an item difficulty near the learner's current estimated mastery.

The backend remains **AI-optional**. Routine grading, unit conversion, mastery tracking, prerequisite logic, and recommendations are deterministic. AI can later be added through a controlled gateway for open-ended reasoning and feedback.

## Student web prototype

`web/` contains the first Armenian-language browser interface. It supports:

- Supabase email/password authentication
- multiple-choice, true/false, numeric and quantity responses
- browser-rendered measurement scales and displacement/measurement stimuli
- server-side grading without exposing answer keys to the browser
- mastery progress and recommendation feedback

The repository includes `vercel.json`, configured to deploy the static `web/` directory.

## Repository structure

- `docs/` — architecture, decisions, backlog, curriculum maps, and domain model
- `backend/core/` — deterministic grading/mastery/recommendation logic
- `supabase/migrations/` — PostgreSQL schema and RLS
- `supabase/functions/` — Supabase Edge Functions
- `supabase/seed/` — controlled curriculum/content seed data
- `tests/` — automated tests for the learning-engine core
- `web/` — first student-facing browser prototype

## Key architecture documents

- `docs/subject-neutral-core.md` — normative boundary between the subject-neutral platform core and versioned subject-aware extensions
- `docs/architecture.md`
- `docs/decisions.md`

## Key curriculum documents

- `docs/grade7-physics-textbook-map.md`
- `docs/curriculum-sources.md`
- `docs/grade7-physics-chapter1-curriculum-architecture.md`

## Automated checks

GitHub Actions runs five required jobs on pushes to `main` and pull requests: `test` (including core parity, tests, typecheck, syntax and shared browser-QA trigger coverage), `role-layout-browser` (isolated Chromium), `institutional-concurrency`, `phase3-postgres-17`, and aggregate `Platform release checks`. See the [workflow](.github/workflows/ci.yml) for the complete gate. The following commands are only the core local subset:

```bash
npm run check:core-parity
npm test
npm run typecheck
node --check web/app.js
```

The parity check compares mirrored modules in `backend/core/` and `supabase/functions/_shared/`, normalizing only relative `.js`/`.ts` import extensions. Other source differences and missing required mirrors fail CI; runtime-only and core-only helpers remain separate.

## Supabase project

Project ref: `xzyjvwiiibuarpotppid`

The Supabase project is active in `eu-central-1`.

## Provenance rule

The current Armenian General Education State Standard, current Physics subject standard and current 2026 Physics programme are authoritative. The 2023 textbook provides the classroom/navigation mapping. Sprint 11J stores the six current Theme 1 outcomes verbatim and classifies every implemented skill and registered family as directly mapped or derived-supporting. Sprint 11K freezes that reconciled baseline as an immutable curriculum release and binds every new session, attempt, exposure event and mastery record to its exact assessment blueprint. Pre-11K evidence remains explicitly legacy; it is never silently reinterpreted against the current release. External Physics SME approval remains a separate production gate.
