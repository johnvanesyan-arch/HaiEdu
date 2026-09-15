# Sprint 11B — Repetition and item-selection policy

## Status

**Complete.** Sprint 11B moves item selection from session-local repetition avoidance to cross-session exposure-aware policy using the provenance introduced in Sprint 11A.

This sprint changes **selection policy**, not grading or mastery cut scores. The current Chapter I bank is still small, so explicit pool-exhaustion fallbacks remain possible until Sprint 11D expands the bank.

## Practice policy

Practice selection now follows this order for the target skill:

1. **Unseen concrete variant** — prefer variants the learner has never been served in any prior tracked session.
2. **Unresolved error after spacing** — if the latest answered exposure for a variant was incorrect, it can return only after it has moved outside the recent-variant cooldown and is not already used in the current session.
3. **Least-recently-seen review** — choose the oldest eligible seen variant, with exposure count and difficulty used as secondary tie-breakers.
4. **Pool-exhausted exact-repeat fallback** — only when every candidate is either on cooldown or already used in the current session. This fallback is explicitly labeled and written into session/item metadata.

The cross-session cooldown is defined over the **three most recently exposed distinct concrete variants** for the target skill. It does not reset merely because the learner starts a new practice session.

The existing mastery-responsive difficulty adjustment remains in place as a tie-breaker inside each policy stage. Repetition policy takes precedence over difficulty matching.

### Integrity boundary

The old `get-practice-item` endpoint could serve assessable content without a session-bound exposure event. It is now retired with HTTP 410. Production practice delivery is:

`start-learning-session` → `get-session-item` → exposure event → answer submission.

## Diagnostic rotation

Sprint 11B introduces explicit `assessment_forms` and `assessment_form_items`.

The current 40 Diagnostic-eligible Chapter I items are split into two non-overlapping baseline forms:

- `PHY7-U01-DIAG-A`
- `PHY7-U01-DIAG-B`

Each form contains exactly 20 items: 2 items for each of the 10 skills.

A new Diagnostic attempt avoids the immediately previous form when another active form exists, then prefers the least-used form for that learner. Form identity is stored in `learning_sessions.metadata.formCode`, and every selected row has an explicit `selection_reason`.

**Important:** the A/B split is structurally non-overlapping but still has `provisionalParallelism=true`. Sprint 11D must review construct/difficulty/content equivalence before the forms are described as validated parallel forms.

## Mastery Check policy

Mastery Check continues to draw only from the protected Mastery pool. Selection now follows this order per skill:

1. unseen protected variants not used in the previous Mastery form;
2. previously exposed protected variants that were not in the immediately previous form, least-exposed/least-recent first;
3. prior-form overlap only as an explicit `mastery_overlap_fallback_pool_exhausted` fallback.

After a failed Mastery Check, the existing remediation gate still applies. Once remediation is satisfied, the next check is labeled `alternate_retest` and tries to minimize overlap with the failed form.

The session stores:

- previous Mastery session ID;
- previous-form item count;
- overlap count;
- whether the protected pool was exhausted;
- whether exact-repeat fallback was used.

With the current Sprint 11A baseline, the protected pool contains only 2 items per skill while a Mastery Check requires 2 per skill. Therefore a second full 20-item check cannot yet achieve zero overlap. The policy now exposes that limitation instead of silently re-serving the same bank. Sprint 11D must expand the protected pool so alternate retests can operate without routine overlap.

## Database changes

Migration `0014_sprint_11b_repetition_selection_policy.sql` adds:

- `assessment_forms`;
- `assessment_form_items`;
- active Diagnostic Forms A and B;
- a membership guard ensuring form items belong to their parent assessment pool;
- staff-only direct read policies for form definitions.

## Code changes

- `_shared/assessment-integrity.ts`
  - cross-session exposure-history loader;
  - Practice selection policy;
  - Mastery alternate-form selection policy;
  - Diagnostic form rotation helper.
- `start-learning-session`
  - rotating Diagnostic form selection;
  - protected unseen-first Mastery composition;
  - retest overlap/fallback metadata.
- `get-session-item`
  - cross-session Practice exposure selection and cooldown;
  - explicit pool-exhaustion metadata.
- `get-practice-item`
  - retired because it cannot provide session-bound exposure provenance.
- `backend/core/item-selection.ts`
  - pure policy model for automated unit tests.

## Acceptance evidence

Automated tests cover:

- unseen Practice variants outrank seen variants;
- unresolved errors return only after spacing;
- least-recent review ordering;
- exact repeat appears only as explicit pool-exhaustion fallback;
- Diagnostic alternates away from the immediately previous form;
- Mastery prefers unseen protected alternatives;
- Mastery overlap is explicitly flagged when alternate protected material is unavailable.

The database was also checked after migration to confirm both Diagnostic forms contain 20 items, cover all 10 skills with exactly 2 items per skill, and have zero item overlap.

## Boundary with later Sprint 11 work

Sprint 11B establishes the policy. It does **not** manufacture additional effective variants. Sprint 11C adds deterministic parameterized/parallel variants, and Sprint 11D expands/reviews the actual Chapter I bank so the fallback paths become exceptional rather than frequent.
