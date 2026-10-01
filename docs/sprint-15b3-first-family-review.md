# Sprint 15B.3 — First-family review and mapping integrity

**Status:** Complete  
**Date:** 2026-10-01  
**Scope:** `PHY7-U02-S02-F01-PARTICULATE-EVIDENCE`

## Decision

The first Chapter II family has passed its bounded human-review and mapping-integrity gate. A second learner-inactive family may now begin, while learner delivery remains fail-closed.

## Reconciled evidence

The product owner reviewed and approved the four initial questions. Production reconciliation found:

- I01, I02 and I04 approved at version 2 with three misconception mappings each;
- I03 approved at version 3, but with zero mappings after a wording revision;
- I03 QA had passed because missing mappings were a warning rather than an error;
- the family template, remediation guide and three misconception definitions remained learner-inactive;
- Chapter II had no assessment pools, blueprints or active release.

I03 also contained `Ո՞ր եզրակացությանն է աջակցում այս դիտարկմանը։`. The natural Armenian correction is `Ո՞ր եզրակացությանն է աջակցում այս դիտարկումը։`.

## Implemented controls

1. An omitted `misconceptions` field preserves current mappings.
2. Replacing a non-empty mapping set with an empty one requires explicit confirmation.
3. Previously attached draft mappings survive the atomic delete/reinsert revision cycle.
4. Templates may opt into `misconceptionMappingPolicy = all_distractors`.
5. Under that policy, technical QA fails when any distractor lacks a mapping.
6. Database triggers block publication and post-publication mapping mutations that would violate the policy.
7. The two trigger functions are executable only by the service role.
8. I03’s three mappings were restored and its Armenian wording corrected.
9. I03 moved to version 4, `review / needs_review`; the other three approvals remain intact.

## Verification

- PR [#78](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/78) merged as `a68acc229a4eaf220a2efe34fada5db83c337406`.
- PR [#79](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/79) merged as `0e06086d5afaf5023476d599515bd12ee113ca78`.
- Both GitHub CI runs passed, including the complete test suite, typecheck, browser JavaScript syntax and institutional concurrency job.
- Vercel reported successful production deployments.
- `manage-content-quality` v6 is active with JWT verification.
- Production has four items, three mappings per item and zero unmapped distractors.
- Chapter II has zero pool links and no non-draft guide.
- Supabase’s new trigger-function privilege warnings were cleared after the follow-up migration.

## Closure evidence

The product owner approved the three exact Armenian misconception definitions. The production closure check confirms:

1. I01, I02 and I04 are approved with passing QA at version 2;
2. I03 is approved with passing QA at version 4;
3. the remediation guide is published at runtime version 2 / authoring version 6;
4. all three approved misconception definitions are active with their reviewed Armenian text unchanged;
5. all four items have exactly three response mappings, for twelve total and zero unmapped distractors;
6. the family has zero assessment-pool links;
7. the Chapter I–II candidate release remains `draft` and has zero assessment blueprints.

PR [#85](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/85) merged as `26db3f4e6774b9bda690d23735edd9aeb7b3054c`. CI #1025 passed, and migration `20261001120500_sprint_15b3_activate_approved_misconceptions.sql` completed successfully in production.

Sprint 15B.4 may create a second learner-inactive family. No assessment pool, blueprint, pilot or learner release is authorized by this closure.
