# Armenian Curriculum Mastery Platform

A multi-subject supplementary learning platform aligned to Armenia's general education system. Physics, Mathematics, Armenian Language, English and future subjects have equal platform status and use the same subject-neutral core. The currently implemented course-content milestone is Grade 7 Physics; that delivery status gives Physics no architectural or product priority.

## Project status

Start with the [authoritative status register](docs/project-status.md) for current delivery stages, dated inventories and unresolved gates. The [roadmap](docs/sprint-roadmap.md) defines sequence, the [backlog](docs/backlog.md) tracks implementation checklists, and the [API contract](docs/api-contract.md) describes the current session workflow and legacy boundaries. Notion is a secondary summary; check its source-commit stamp before relying on its copy. Synchronization to this change follows merge and requires readback verification.

Chapter II has 192 approved questions, 263 active definitions and 57 published guides, with no pending content. The owner has authorized a [provisional Chapter II pilot](docs/chapter-ii-pilot-release.md) with specialist review deferred. Its implementation is merged, all five final CI jobs passed, and the frontend is deployed. A [Supabase connector failure](docs/evidence/chapter-ii-pilot-deployment-blocker-20261013.json) blocks database migrations; Chapter II remains draft and inactive. Production configuration, activation and authenticated chapter-switching acceptance are still pending. Independent SME and final historical-exposure decisions remain required for production promotion. Chapter I remains on its existing pilot. Sprint 12.5 is complete, Sprint 13 is closed for sequencing, and Sprint 14 / 15B.12E retain their live switching acceptance dependency. See the register for evidence and later planned stages.

Chapter III now has [offline preparation](docs/chapter-iii-preparation.md): six current official outcomes, eight proposed skills, a proposed 168-question bank and eight practice drafts with textbook illustrations. No Chapter III content is staged or approved; fresh whole-bank qualification and plan/content review remain open. Chapter II deployment retries are paused at the owner's request.

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
