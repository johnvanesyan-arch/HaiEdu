# Armenian Curriculum Mastery Platform

A supplementary learning platform aligned to Armenia's general education system. The first proof of concept is **Grade 7 Physics**.

## Current milestone

Sprint 1 is now building the first real curriculum slice:

**Grade 7 Physics → Chapter I: Բնության ուսումնասիրության ֆիզիկական մեթոդները**

The live Supabase database currently contains:

- 1 Grade 7 Physics Chapter I unit
- 5 draft/review topics
- 10 draft/review micro-skills
- 9 prerequisite links
- 0 current official learning-outcome records for this unit pending exact verification of the 2026 Grade 7 programme appendix

The micro-skill graph covers physical phenomena; body/material/phenomenon distinctions; physicists; observation vs experiment; scientific inquiry; quantities/units/instruments; unit conversion; instrument scales; measurement error/precision; and an integrated irregular-volume measurement investigation.

## Core backend objective

Prove the complete learning loop:

`item -> student answer -> deterministic grading -> attempt record -> mastery update -> prerequisite diagnosis -> recommendation`

The backend is intentionally **AI-optional**. Routine grading, mastery tracking, prerequisite logic, and recommendations are deterministic. AI can later be added through a controlled gateway for open-ended reasoning and feedback.

## Repository structure

- `docs/` — architecture, decisions, backlog, curriculum maps, and domain model
- `backend/core/` — deterministic grading/mastery/recommendation logic
- `supabase/migrations/` — PostgreSQL schema and RLS
- `supabase/functions/` — Supabase Edge Functions
- `supabase/seed/` — controlled curriculum/content seed data
- `tests/` — automated tests for the learning-engine core

## Key curriculum documents

- `docs/grade7-physics-textbook-map.md`
- `docs/curriculum-sources.md`
- `docs/grade7-physics-chapter1-curriculum-architecture.md`

## Local checks

```bash
npm test
npm run typecheck
```

## Supabase project

Project ref: `xzyjvwiiibuarpotppid`

The Supabase project is active in `eu-central-1`.

## Provenance rule

The current Armenian General Education State Standard and current 2026 Physics programme are authoritative. The 2023 textbook provides the classroom/textbook mapping. We do not publish repealed programme wording as current official outcomes. Internal micro-skills may be developed in `review` status before official-outcome verification and Physics-SME validation.
