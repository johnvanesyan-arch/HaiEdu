# Sprint 0 status

## Live infrastructure

- GitHub repository: `johnvanesyan-arch/armenian-mastery-platform`
- Supabase project: `armenian-mastery-platform`
- Supabase project ref: `xzyjvwiiibuarpotppid`
- Region: `eu-central-1`
- Edge Function `submit-answer`: ACTIVE, JWT required

## Completed

- Subject-neutral Supabase/PostgreSQL domain model
- Grade structure and Physics subject seed
- Curriculum/programme/textbook mapping entities
- Skill and prerequisite graph
- Student-readable items separated from protected answer keys
- Deterministic grading engine for single-choice, true/false, numeric, and physical-quantity responses
- Basic unit conversion support
- Mastery Engine v0.1 with transparent Beta-evidence state
- Recommendation Engine v0.1
- Atomic attempt + mastery database write RPC
- Supabase RLS baseline
- `submit-answer` Edge Function deployed
- Automated core-engine tests

## Local verification

- Core TypeScript compilation: PASS
- Automated tests: 10/10 PASS

## Next milestone

Create the first real Grade 7 Physics curriculum slice and perform a live integration test with an authenticated test student.
