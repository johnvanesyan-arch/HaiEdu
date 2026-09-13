# Armenian Curriculum Mastery Platform

A supplementary learning platform aligned to Armenia's general education system. The first proof of concept is **Grade 7 Physics**.

## Current milestone

The project now has a working Chapter I learning-engine slice for:

**Grade 7 Physics → Chapter I: Բնության ուսումնասիրության ֆիզիկական մեթոդները**

The live Supabase database currently contains:

- 1 Grade 7 Physics Chapter I unit
- 5 topics
- 10 provisional micro-skills
- 9 prerequisite links
- 60 provisional development items
- 60 server-side answer keys
- 140 multiple-choice option records
- 14 structured visual/stimulus items
- 0 current official learning-outcome records for this unit pending exact verification of the 2026 Grade 7 programme appendix

The micro-skill graph covers physical phenomena; body/material/phenomenon distinctions; physicists; observation vs experiment; scientific inquiry; quantities/units/instruments; unit conversion; instrument scales; measurement error/precision; and integrated measurement investigations.

Content is intentionally marked `provisional_no_sme_review` and `pilot_ready=false`. Physics-SME review was deferred for development speed, not treated as completed validation.

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

The current Armenian General Education State Standard and current 2026 Physics programme are authoritative. The 2023 textbook provides the classroom/textbook mapping. We do not publish repealed programme wording as current official outcomes. Internal micro-skills and items may be developed provisionally before official-outcome verification and Physics-SME validation, but they cannot be treated as validated pilot content until those gates are completed.
