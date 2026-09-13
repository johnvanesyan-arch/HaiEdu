# Armenian Curriculum Mastery Platform

A supplementary learning platform aligned to Armenia's general education system. The first proof of concept is **Grade 7 Physics**.

## Sprint 0 objective

Prove the core backend learning loop:

`item -> student answer -> deterministic grading -> attempt record -> mastery update -> recommendation`

The backend is intentionally **AI-optional**. Routine grading, mastery tracking, prerequisite logic, and recommendations are deterministic. AI can later be added through a controlled gateway for open-ended reasoning and feedback.

## Repository structure

- `docs/` — architecture, decisions, backlog, and domain model
- `backend/core/` — deterministic grading/mastery/recommendation logic that can be unit-tested locally
- `supabase/migrations/` — PostgreSQL schema and RLS
- `supabase/functions/` — Supabase Edge Functions
- `tests/` — automated tests for the learning-engine core

## Local checks

```bash
npm test
npm run typecheck
```

## Supabase project

Project ref: `xzyjvwiiibuarpotppid`

The Supabase project is active in `eu-central-1`.

## Current content scope

The database is ready for Grade 7 Physics, but **no official curriculum outcomes or textbook mappings are invented in this scaffold**. Those will be inserted only after we map the current official Grade 7 Physics programme and textbook.
