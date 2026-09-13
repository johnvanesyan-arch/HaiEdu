# Architecture Decision Log

## ADR-001 — Physics first
**Decision:** First developed subject is Grade 7 Physics.

## ADR-002 — Subject-neutral backend
**Decision:** Database and learning engine remain generic so Mathematics, Armenian, Chemistry, Biology, etc. can be added without schema redesign.

## ADR-003 — Deterministic core
**Decision:** Routine grading, mastery, prerequisite checks, and recommendations do not require generative AI.

## ADR-004 — Supabase backend
**Decision:** Initial backend target is Supabase: PostgreSQL, Auth, RLS, and Edge Functions.

## ADR-005 — Protect answer keys
**Decision:** Correct answers are stored in a separate protected table and are never exposed to student clients.

## ADR-006 — Curriculum before content scale
**Decision:** No official Grade 7 Physics learning outcomes, textbook sections, or curriculum claims will be invented. Curriculum content is populated only after source mapping.

## ADR-007 — Mastery v0.1 is provisional
**Decision:** Use a transparent Beta-evidence update model for the MVP. Validate and revise after pilot data rather than claiming psychometric validity prematurely.
