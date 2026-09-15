# Sprint 11A — Item-bank identity, assessment pools, and exposure model

## Status

**Implemented and deployed.** Sprint 11A establishes the assessment-integrity data model required by later Sprint 11 selection, variant-generation, bank-expansion, and pilot work.

It does not claim that the current 60-item Chapter I bank is already large enough for the pilot. The current pool allocation is deliberately transitional and will be re-audited and expanded in Sprint 11D.

## 1. Item identity model

Sprint 11A separates four levels that were previously conflated:

1. **Skill** — the learning construct being measured.
2. **Item family** — a pedagogically related family of items measuring the same construct in a comparable way.
3. **Template** — a fixed, parameterized, or parallel item-generation definition within a family.
4. **Concrete variant** — the exact rendered item/variant shown to a learner.

New normalized tables:

- `item_families`
- `item_templates`

New `items` fields:

- `item_template_id`
- `variant_key`
- `variant_seed`
- `variant_parameters`

The 60 legacy fixed items are conservatively backfilled as singleton families/templates. This is intentional: the old `items.item_family` values such as `knowledge`, `application`, and `unspecified` are broad content tags, not sufficiently reviewed pedagogical family identities. Sprint 11D may merge/reclassify these singleton families after human content review.

## 2. Explicit assessment eligibility and protected pools

Assessment eligibility is represented through:

- `assessment_pools`
- `assessment_pool_items`

Chapter I currently has three active baseline pools:

| Pool | Purpose | Protected |
| --- | --- | --- |
| `PHY7-U01-PRACTICE-BASELINE` | Practice | No |
| `PHY7-U01-DIAGNOSTIC-BASELINE` | Diagnostic | No |
| `PHY7-U01-MASTERY-PROTECTED-A` | Mastery Check | **Yes** |

The learner-facing selection functions now resolve item eligibility through these pools instead of assuming that every published item is valid for every purpose.

### Transitional Chapter I allocation

Until Sprint 11D expands and re-audits the bank, each skill's six current fixed items are split mechanically:

- 4 items eligible for Practice;
- the same 4 currently eligible for the baseline Diagnostic pool;
- 2 items reserved for the protected Mastery pool.

This allocation establishes the security/integrity boundary immediately. It is **not** a claim that the provisional Mastery items have already passed a pedagogical suitability review. Sprint 11D must re-audit the full 60-item bank and replace this transitional allocation with reviewed pools.

## 3. Mastery protection boundary

Protected Mastery items are no longer ordinary published learner content.

Database RLS prevents anonymous and ordinary authenticated learner reads of protected items and their options. Authorized server-side assessment functions use the service role to load them only after the learner is in a legitimate Mastery Check session.

Both current Practice selection paths are constrained to the Practice pool, including the older compatibility endpoint. A protected Mastery item therefore cannot be selected by ordinary Practice merely because its `items.status` is `published`.

## 4. Student exposure history

New table: `student_item_exposure_events`.

One row represents one concrete session-item exposure and records a snapshot of the identity at serving time:

- student;
- item;
- item family;
- template;
- concrete variant key;
- purpose (`practice`, `diagnostic`, `mastery_check`);
- session and session item;
- `served_at`;
- `answered_at`;
- attempt;
- correctness;
- help use;
- highest hint level used;
- response time;
- metadata.

Because every exposure event has a timestamp, the system can derive both **frequency** (`count`) and **recency** (`max(served_at)`) at item, template, family, or purpose level without maintaining fragile duplicate counters.

`session_item_id` is unique, making serving instrumentation idempotent: refreshing or re-fetching the same question does not create a second exposure event.

## 5. Exposure write path

Three service-role RPCs support the lifecycle:

- `service_record_item_exposure` — records that a concrete question was actually served;
- `service_finalize_item_exposure` — attaches answer outcome, response time, and help state;
- `service_record_item_help` — records hint/help usage.

The canonical `get-session-item` function records the serve event before returning a question.

`record_session_graded_attempt` finalizes the exposure inside the same database transaction as the attempt/session update. This preserves provenance between the served question and the graded attempt.

Remediation events also synchronize help state, including help requested after an incorrect answer.

## 6. Privacy and isolation

Exposure history is not client-writable.

Students can read only rows where `student_id = auth.uid()`. Content administrators and administrators can read exposure evidence for integrity analysis. Service-role functions own writes.

This prevents one learner's exposure history from becoming an input available to another learner through direct table access.

## 7. Validation completed

Sprint 11A validation includes:

- all 60 existing items have normalized family/template/variant identity;
- 20 Chapter I items are in the protected Mastery pool;
- every Chapter I skill currently has 4 Practice, 4 Diagnostic, and 2 protected Mastery items;
- Practice ↔ protected Mastery item overlap is zero;
- rollback-only database QA verified exposure serving is idempotent and that help level, correctness, and response time are persisted correctly;
- repository regression tests cover the new identity model, pool boundaries, exposure model, and learner-isolation policy;
- relevant Edge Functions are deployed with JWT verification enabled.

## 8. Deliberate boundary before Sprint 11B/11D

Sprint 11A provides **identity, eligibility, protection, and instrumentation**. It does not yet solve the small-bank repetition problem.

With only four currently eligible Practice items per skill, exact-repeat pressure remains. This is expected at this intermediate point. Sprint 11B will make selection cross-session exposure-aware and define explicit pool-exhaustion behavior; Sprint 11C/11D will create more effective variants and expand/review the content pools.

The architecture therefore prevents Mastery leakage now without pretending that the Chapter I bank is already pilot-ready.
