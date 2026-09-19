# Armenian Curriculum Mastery Platform

A supplementary learning platform aligned to Armenia's general education system. The first proof of concept is **Grade 7 Physics**.

## Current milestone

The project now has a working Chapter I learning-engine slice for:

**Grade 7 Physics → Chapter I: Բնության ուսումնասիրության ֆիզիկական մեթոդները**

The live Supabase database currently contains:

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

`authenticated student -> adaptive item selection -> student answer -> deterministic grading -> attempt record -> mastery update -> prerequisite diagnosis -> recommendation`

Two JWT-protected Supabase Edge Functions are live:

- `get-practice-item`
- `submit-answer`

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

## Key curriculum documents

- `docs/grade7-physics-textbook-map.md`
- `docs/curriculum-sources.md`
- `docs/grade7-physics-chapter1-curriculum-architecture.md`

## Automated checks

GitHub Actions runs the core test suite, TypeScript typecheck and JavaScript syntax validation on pushes to `main` and pull requests.

```bash
npm test
npm run typecheck
node --check web/app.js
```

## Supabase project

Project ref: `xzyjvwiiibuarpotppid`

The Supabase project is active in `eu-central-1`.

## Provenance rule

The current Armenian General Education State Standard, current Physics subject standard and current 2026 Physics programme are authoritative. The 2023 textbook provides the classroom/navigation mapping. Sprint 11J stores the six current Theme 1 outcomes verbatim and classifies every implemented skill and registered family as directly mapped or derived-supporting. Sprint 11K freezes that reconciled baseline as an immutable curriculum release and binds every new session, attempt, exposure event and mastery record to its exact assessment blueprint. Pre-11K evidence remains explicitly legacy; it is never silently reinterpreted against the current release. External Physics SME approval remains a separate production gate.
