# Atomic answer scoring

Overlapping requests previously read the same skill state before their SQL
transactions. Both attempts and session counters were recorded, but the last
absolute mastery update could overwrite the other answer's contribution.

The service-only answer RPC now locks the session and assigned item, writes the
attempt, accumulates mastery under a learner/skill transaction lock, and records
the exposure and counters in one transaction. Repeated assignments return an
existing attempt without adding evidence; the Edge handler retains HTTP 409 for
an already answered item. Errors roll back the complete transaction.

The handler uses the committed before/after state for feedback, recommendations
and telemetry. Old RPC signatures delegate to the same accumulator and ignore
stale precomputed mastery totals, supporting SQL-before-Edge rollout.

Transaction coordination belongs to the subject-neutral core. The existing
weighted-evidence adapter reads priors, the numeric linear difficulty formula,
hint multiplier, minimum evidence and status thresholds from the attempt's
immutable model configuration. It does not select a default subject or change
learning criteria. Bound sessions retain their model; legacy unbound/sessionless
resolution requires an exact primary item scope and active release/unit binding.
Unsupported model contracts fail closed. Additional scoring strategies need
their own governed adapter; this fix does not claim a universal subject grader.

`tests/answer-scoring-atomic.test.mjs` runs the real SQL and actual answer handler
with in-memory PGlite. `tests/answer-scoring-concurrency.py` uses the existing
disposable PostgreSQL 17.6 CI fixture and independent connections. Both accept
no remote credentials. Synthetic provenance/exposure adapters and Auth/course
doubles are explicit; this is not live Auth/MFA/browser acceptance. Existing
diagnostic prerequisite triggers run unchanged in the fixtures.

Deploy the migration after required CI passes, then the answer Edge function,
with JWT verification enabled. Preserve existing authorization dependencies and
read back the SQL and bundle. Record the new implementation/runtime provenance
without modifying the immutable learning-model baseline or historical evidence.
No historical learner-state rebuild is included in this fix.
