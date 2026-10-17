# Chapter III technical release preparation

2026-10-17 · Sprint 15C.25 · Roadmap 3.90 · Prepared and rehearsed; not activated

John directed: “We will do the handoff and review later. Proceed with the next part.” This defers the independent specialist handoff/review while technical release preparation proceeds. It does not record specialist approval or a live activation decision. The separate release boundary in `AGENTS.md` remains in force.

## Completed preparation

The existing 168 approved questions (80 Practice, 32 Diagnostic, 56 Mastery), 80 published guides and 344 active definitions are unchanged. Their current approval/QA IDs and exact form version bindings match the ordinary-review closure. Approved textbook/physics, Armenian and whole-bank evidence is reused; no new content audit or independent qualification is claimed.

The restricted package contains three pools, four blueprints/policy contracts, one chapter-scoped model and one runtime binding. The model retains the baseline numerical parameters and uses the already deployed v2 runtime; no shared runtime, Edge Function or schema deployment is needed. The five exact forms contain 80 different items, with eight separately recorded Mastery reserves. Every form preserves 16 questions, 2/1/3/3/1/2/3/1 per skill, and 10 mandatory / 2 supporting / 4 additional. The approved four-skill readiness/pass scope, 8/10 threshold, three attempts, Practice 8 and Review 12 are unchanged. Reserves are never substituted automatically.

`prepare-chapter-iii-pilot.py` builds the chapter-specific SQL from restricted inputs and defaults to `ROLLBACK`. It checks the exact draft, approvals/QA, form/reserve bindings, scope, existing pilots, runtime fingerprint and approved scoring contract. Before making temporary changes it locks content and release rows and checks the frozen inventory. It preserves prior rows, leaves the external specialist gate pending and never fills an independent reviewer field. A commit transaction can be generated only with a separately recorded, bounded owner activation decision, including the deferred specialist/exposure limitations.

## Verification

- The full transaction ran against the actual production schema at 06:09 UTC and ended with `ROLLBACK`. Actual model/policy/form validators and activation triggers accepted the proposed configuration, including all four exact v2 policy contracts and the existing whole-form Mastery binder.
- All 61 in-transaction preservation scopes passed. Independent follow-up SELECTs confirmed all 59 public table counts/fingerprints exactly restored. The active-unit registry still contains only Chapters I and II; Chapter III is draft, without an activation date, pools, blueprints, forms or policy bindings. Its reconciliation reviewer remains null.
- Isolated PGlite insertion passed 38 non-FK constraints across ten production table definitions for 510 proposed configuration rows. The production rollback separately exercised real foreign keys and triggers.
- Sixteen focused Node tests passed, including four Python generator cases. They cover unsafe/stale inputs, duplicate or reserve reuse, the activation boundary, 10-question pass denominator, four required skills, two-school reads, all mismatched chapter/release pairs, incomplete diagnostic preservation and activation-gated workflow routing.

These checks do not constitute a completed learner attempt, independently qualified forms, empirical equivalence or authenticated Chapter III browser acceptance. The latter awaits an active chapter. No database transaction committed; no learner session, answer or exposure was created. Approved content and Armenian wording were not edited.

## Prepared production acceptance

The new bounded runner verifies six designated QA identities, the exact reviewed-main frontend, preserved Chapters I/II and Chapter III's v2 dashboard. It checks native desktop/mobile Home → I → II → III → I navigation, 10/2/4 reporting, the 8/10 instruction, direct protected-read denials, cross-school and role denials, all mixed release/unit combinations, and before/after learner evidence. Browser requests are limited to reads/token refresh; starting a session, serving an item or submitting an answer is blocked.

The workflow is prepared but does not run on this merge. Its first automatic trigger is the future verified activation-evidence file. It checks that file before installing browsers or loading credentials. When activation evidence is added, `check-browser-qa-triggers.mjs` requires full frontend/runner/API dependency trigger coverage in that same change. The existing shared QA queue, reviewed-main guard and exact deployed-commit check remain mandatory.

## Remaining release step

1. Record the separate owner decision to activate Chapter III as a bounded provisional pilot with specialist/exposure review deferred. Independent qualification stays unclaimed; final exposure disposition and specialist approval remain required for production promotion.
2. Refresh the current state and approved version inputs against the exact reviewed main revision; regenerate and rehearse. Any content, history, runtime or binding drift stops the transaction for reconciliation. Commit only the resulting authorized transaction, then read it back.
3. Save verified activation evidence with both preserved chapters and the v2 policy identity; expand the workflow triggers, merge and run authenticated production acceptance against the exact deployed revision. Save the results and sync the status register and Notion.

The specialist handoff remains ready for later. Its reviewer fields and exposure/dependence decisions stay unfilled; retained historical Git/PR exposure limitations are not erased by this preparation. All questions, hints and examples retain their approved language and textbook references.

[Sanitized evidence and restricted-package digest](evidence/chapter-iii-release-preparation-20261017.json) · [Authoritative status](project-status.md) · [Deferred specialist packet](grade7-physics-chapter3-sme-review.md). Required CI/merge and source-commit-verified Notion synchronization close this delivery cycle; they do not activate Chapter III.
