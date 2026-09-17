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

## ADR-008 — Unit-bound learning guidance and mastery verification
**Decision:** Diagnostics are unit-bound learning-guidance assessments; mastery checks are unit-bound verification assessments; practice is skill-bound inside a unit; course progress aggregates unit evidence. A future cumulative/final course assessment must be a separate explicit assessment type.

**Consequences:**
- every diagnostic and mastery-check session must resolve to a `unit_code`;
- a diagnostic does not pass/fail and does not verify the course;
- a mastery check verifies one unit, not the whole course;
- unit skill counts are variable and must not be globally hardcoded to 10;
- the current PHY7-U01 10-skill / 20-item blueprint is a Unit I configuration, not a platform-wide rule.
