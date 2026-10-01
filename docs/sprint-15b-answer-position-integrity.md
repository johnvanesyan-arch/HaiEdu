# Sprint 15B — Correct-answer position integrity

**Status:** implemented as a governed, learner-inactive Chapter II revision. Seven affected items require a fresh technical QA run and human re-approval before any learner release.

## Why this checkpoint exists

The first twelve Chapter II questions were semantically sound, but their private canonical answer keys were unevenly distributed: `A=8`, `B=1`, `C=3`, `D=0`. Learners do not receive that canonical order because the shared assessment boundary shuffles options server-side. Canonical balance still matters for reviewer screens, exports, fixed-order exceptions and future maintenance, and prevents an authoring habit from becoming a hidden positional cue if content ever leaves the normal runtime path.

This checkpoint therefore adds two complementary controls:

1. keep the existing platform-wide server-side presentation shuffle as the runtime protection;
2. detect avoidable answer-position concentration during content QA and balance the current Chapter II families through ordinary versioned revisions.

## Platform-wide runtime audit

The production audit covered every published single-choice item and every current learner assessment mode.

| Check | Result |
|---|---:|
| Published single-choice items | 131 |
| Covered by the effective shuffle policy | 131 |
| Explicit `shuffleOptions=true` | 12 |
| Inherit the secure default `true` | 119 |
| Fixed-order exceptions | 0 |
| Unjustified fixed-order exceptions | 0 |

The global `mcq_option_order` configuration is enabled with algorithm version `mcq-option-order-v1`. The server creates a private option permutation per learning-session item, persists it for refresh/resume, avoids the immediately preceding permutation for the same learner and item, and exposes only presentation labels to the learner. Submission translates the selected presentation position back to the canonical key on the server before grading.

The boundary is shared by Diagnostic, Practice, Mastery Check and Chapter Review. `submit-mastery-answer` delegates to the shared submission function, and the retired legacy practice endpoint returns HTTP 410 rather than bypassing the protected session path. The order-creation RPC is executable only by `service_role`; learner and anonymous access to canonical options and answer keys remains blocked by privileges and RLS.

This is platform-wide for the current shared assessment architecture, not Physics-specific. Future subjects and grades receive the same protection when they use `learning_session_items`, `get-session-item` and `submit-answer`. A future independent assessment endpoint must not be allowed to bypass that boundary and requires the same architecture and regression gate.

## Chapter II versioned correction

All twelve Chapter II items had zero enabled assessment-pool links and zero learner-session exposure when this correction was prepared. Seven items are re-keyed by swapping the content assigned to two private canonical option keys. The set and meaning of the four options do not change; misconception mappings move with the distractor, and the answer key moves with the correct option.

| Family | Before | After |
|---|---|---|
| `PHY7-U02-S02` | `A=1, B=1, C=2, D=0` | `A=1, B=1, C=1, D=1` |
| `PHY7-U02-S03` | `A=3, B=0, C=1, D=0` | `A=1, B=1, C=1, D=1` |
| `PHY7-U02-S04` | `A=4, B=0, C=0, D=0` | `A=1, B=1, C=1, D=1` |
| **Chapter II total** | **`A=8, B=1, C=3, D=0`** | **`A=3, B=3, C=3, D=3`** |

The migration fails closed if any planned item has changed from the reviewed precondition, has fewer or more than four options, lacks the expected misconception mapping, has entered an enabled pool, or has any learner-session exposure. It preserves the approved pre-change snapshot, creates a new immutable version, recomputes the semantic fingerprint and returns the revised item to `review / needs_review`.

## Authoring QA rule

Technical QA now evaluates the answer-key distribution across the active single-choice siblings of a template. For a family large enough to cover all available positions, it warns when a position is unused or when one position exceeds 50% of the family. The warning is advisory rather than an automatic content rejection, because small families and legitimate fixed-order material require human judgment.

If an item explicitly sets `shuffleOptions=false`, technical QA requires a non-empty `optionOrderRationale`. Runtime serving already fails closed for an unjustified fixed-order item. The reviewer interface renders both findings in natural Armenian.

## Re-approval boundary

The following seven items return to review and must receive current-version technical QA plus human approval:

- `PHY7-U02-S02-I04`
- `PHY7-U02-S03-I02`
- `PHY7-U02-S03-I03`
- `PHY7-U02-S03-I04`
- `PHY7-U02-S04-I02`
- `PHY7-U02-S04-I03`
- `PHY7-U02-S04-I04`

No pool, blueprint, pilot or learner release is created by this checkpoint. The three unchanged `I01` items retain their approved versions.

## Verification and deployment evidence

- focused answer-position and Chapter II regression suite: 40/40 passed;
- JavaScript syntax validation passed;
- the full migration first executed successfully inside a production transaction and was rolled back, producing `A=1, B=1, C=1, D=1` for each family;
- production migration `20261001161000_sprint_15b_answer_position_integrity.sql` then applied successfully;
- production verification found each family at `A=1, B=1, C=1, D=1` and the full chapter at `A=3, B=3, C=3, D=3`;
- all seven revised items have one current-version snapshot, `review / needs_review`, the expected new key, zero enabled pool links and zero learner-session exposure;
- the active 131-item bank has 124 published and seven review items, with 12 explicit shuffle opt-ins, 119 inherited secure defaults and zero fixed-order exceptions;
- `mcq-option-order-v1` remains enabled, and the order RPC is executable by `service_role` but not `authenticated` or `anon`;
- `manage-content-quality` v7 is active with JWT verification and contains both the distribution warning and fixed-order rationale guard;
- the post-change advisor counts match the pre-change baseline; no new security or performance finding was introduced. Existing notices remain tracked separately: [RLS/no-policy information](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [RLS init-plan performance](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) and [multiple permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies);
- [PR #89](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/89) merged as `00a0ab9918ee669d07f6d159a32c6388bbde4621`; pre-merge CI #1067 and main CI #1068 passed, and the Vercel production deployment completed successfully.
