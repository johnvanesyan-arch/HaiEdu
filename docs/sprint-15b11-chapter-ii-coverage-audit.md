# Sprint 15B.11 — Chapter II coverage and assessment audit

**Status:** audit and review packet complete; content budget and assessment/scoring decisions proposed, not approved.  
**Date:** 2026-10-05  
**Repository reviewed:** `235021fb27f9bc3e222476fa987eb47031f405ff`  
**Evidence:** [read-only snapshot](evidence/sprint-15b11-audit-20261005.json)  
**Scope:** Chapter II content planning plus an inventory of shared runtime dependencies. No production writes, gate decisions, pool assignments, learner releases or scoring changes.

## Where the sprint stopped

15B.10 closed the initial S09 question review, completing one four-question family for each of S02–S09. The initial family pass contains **32 approved questions**, not the final chapter bank.

Live checks at 15:53:51 and 16:00:46 UTC supersede the earlier guide inventory: **all eight guides are published**. S02–S06 have guide version 3; S07–S09 have version 2. Three S02 misconception definitions are active; **40 definitions across S03–S09 remain draft**.

All 32 current item versions have passing latest matching-version technical QA and human approval. S02-I01's stored QA includes two historical warnings, `content_review_not_approved` and `sme_review_pending`; its current item approval is now approved, while external SME remains unresolved. The other 31 matching-version QA records have no warnings. Do not describe the whole bank as warning-free or SME-approved.

There are zero Chapter II assessment-pool links and zero learner session-item links. The candidate release `physics7_u01_u02_2026_08_14_candidate_r2` remains draft with zero blueprints. The existing Chapter I release remains pilot.

S01 remains archived because it duplicated Chapter I S02. That existing skill is the cross-unit prerequisite. Codes are preserved; there is no missing new S01 family to author.

## Outcome coverage

The governed candidate snapshot contains five mandatory and two additional Theme 2 outcomes. S03 is a supporting decomposition of mandatory 1(1), not an eighth official outcome. Every official outcome has a directly mapped initial family, but mapping coverage does not establish assessment sufficiency, independent performance or SME validation.

| Skill | Programme relationship | Initial evidence | Priority for additional authoring |
|---|---|---|---|
| S02 | Direct: mandatory 1(1), particle structure | Four observation-to-explanation choices | New observations and particle representations; distinguish evidence from unsupported explanations |
| S03 | Supporting: mandatory 1(1), atoms/molecules/elements | Four classification choices | New representations and composition comparisons; keep supporting status explicit |
| S04 | Direct: mandatory 1(2), molecular sizes | Unit conversion, ordering, scale analogy, row measurement | New scales, tabulated comparisons and measurement applications, not only changed numbers |
| S05 | Direct: mandatory 1(3), particle motion | Motion, collisions, paths and delayed spreading | Trajectory representations and changed contexts that separate path length from displacement |
| S06 | Direct: mandatory 1(4), diffusion examples | Definition and liquid/biological examples | Unfamiliar examples and non-examples; distinguish diffusion from bulk mixing or phase change |
| S07 | Direct: additional 2(1), diffusion in states | Ordering, observations, solid diffusion, explanation | Controlled-condition comparisons; avoid presenting a universal rate law independent of material and conditions |
| S08 | Direct: mandatory 1(5), temperature and motion | Same-material relation, application, 0 °C, different gases | Further data interpretation with material/state conditions explicit |
| S09 | Direct: additional 2(2), thermometer principle | Expansion, cooling, conserved liquid, tube width | Different apparatus representations and explanations within stated operating conditions |

The current response types are 31 single-choice and one true/false. They provide selected-response evidence of reasoning; they do not show a learner independently producing an explanation or performing an experiment. Future tasks must preserve that distinction in analytics and claims. Adding a constructed-response or practical-assessment capability would be a separate governed extension, not a prerequisite invented by this audit.

S07–S09 formally cover the four prospective evidence purposes. S02–S06 predate that contract and remain valid under its legacy treatment. New templates must use `haiedu-evidence-blueprint-v1`; do not backfill or invalidate existing approvals merely to make the inventory uniform. Four purposes do not mandate four items or one response type for every new family.

## Assessment bank option for review

**Option A: 192 authored questions for this chapter. This is a planning option, not an activated blueprint or an approved universal count.**

| Purpose | Proposed inventory | Proposed delivery | Existing questions assigned in this plan | Additional authoring |
|---|---:|---|---:|---:|
| Practice and Chapter Review | 96: 12 per skill | Skill practice and whole-chapter review share this bank | 32 | 64 |
| Initial diagnostic | 32: 4 per skill | Two disjoint 16-question forms, 2 per skill per form; one completed baseline per learner/chapter | 0 | 32 |
| Protected mastery | 64: 8 per skill | 16 per attempt, 2 per skill; up to 3 attempts | 0 | 64 |
| **Total distinct questions** | **192** | Review does not add another bank | **32** | **160** |

Why this is a useful working budget:

- The practice reserve adds two new four-item-equivalent batches per skill, while family boundaries and actual sizes remain outcome-appropriate.
- Six protected items per skill are the arithmetic minimum for three disjoint two-item attempts. Eight leave two spare per skill for variety or withdrawal, provided all remain eligible and unexposed.
- Diagnostic and mastery questions stay outside practice, review and remediation examples. Check semantic/stimulus overlap as well as item-ID overlap.
- Twelve practice items per skill do **not** guarantee two unseen eight-question sessions. Review also consumes exposure, and retries can revisit errors under the existing selection policy.
- A bank size is an operational content budget, not evidence of reliability, equal difficulty, psychometric parallelism or sufficient explanatory depth.

The current Chapter I active pool memberships provide a comparison only: 40 diagnostic, 120 practice and 80 protected mastery entries, with two active 20-question diagnostic forms. Its separate Chapter Review pool has no direct members; the current review blueprint snapshots the 120-item practice bank. These are not platform defaults and the wider historical total of 260 must not be confused with active pool membership.

### Decisions before allocating or activating this option

1. **Assessment length:** approve or revise the proposed 16 questions for Chapter II. This follows two per each of its eight skills; it does not change Chapter I's 20-question assessments. If 20 is required, define the extra four slots by outcome/evidence value before authoring and recalculate the protected inventory.
2. **Mandatory/additional/supporting scoring:** decide how S07/S09 and supporting S03 affect readiness and passing. Do not silently turn additional outcomes into compulsory pass gates. Recommended design: retain their evidence and report their programme category; record consequential scoring explicitly in this chapter's versioned assessment policy.
3. **Pass and readiness rules:** the existing 80% plus at least one correct per skill is not automatically approved for this chapter. If retained over all 16 questions, its arithmetic is at least 13 correct plus the per-skill condition. That describes the option, not a live rule.
4. **Budget:** approve or adjust the 192-question option after the above decisions. Initial questions are proposed for practice; no database assignment has been made.

Preserve the accepted baseline flow: one completed chapter diagnostic regardless of score; practice/review unlocked only after it; no forced second diagnostic. Preserve the active retry lifecycle: at most three mastery attempts, review required after failures 1 and 2, optional after passing, available after final failure, no fourth attempt. A change to that lifecycle requires a separate policy decision.

The active policy's review target is 12. That could cover all eight skills with four further selections, subject to the governed review selection policy and its eligibility rules. The actual weighting, exposure behaviour and completion rules must be verified in the runtime migration.

## Confirmed release blocker: runtime scope is still coupled

Production `start-learning-session` version 22 is byte-for-byte identical to the reviewed repository entrypoint. It fixes `UNIT_CODE = "PHY7-U01"`, selects `PHY7-U01-S%`, calls `hasPhysics7Access`, and selects Chapter I diagnostic forms. Its body does not accept an authorized unit context. Simply adding Chapter II pools cannot make Chapter II sessions work.

The generic curriculum resolver and database lifecycle contracts are useful foundations, but the following first-pass consumer inventory needs a bounded shared-core migration:

| Surface | Observed dependency | Required behaviour |
|---|---|---|
| `start-learning-session/index.ts` | Fixed unit, skill prefix, course entitlement, form pool and item/scoring constants | Resolve exact authorized context, release, skills, pool/forms and versioned assessment policy |
| `get-student-dashboard/index.ts` | Fixed Chapter I scope and Physics entitlement | Report the selected authorized context and evidence provenance |
| `get-mastery-check-status/index.ts` | Fixed scope and `questions: 20` | Return criteria/counts from the governing assessment policy |
| `get-session-item/index.ts`, `submit-mastery-answer/index.ts` | Physics-specific entitlement before session handling | Authorize the session's exact subject/class/release context |
| `_shared/course-access.ts`, `_shared/assessment-integrity.ts` | Physics helper and Chapter I pool registry | Shared entitlement/selection contracts with explicit scoped extensions |
| `web/student-courses.js`, `web/mastery.js` | Physics route special cases and literal 20-question/three-attempt instructions | Authorized context navigation and policy-driven instructions |

This is an initial inventory, not a claim that all consumers have been enumerated. The implementation slice must trace submit-answer, help/remediation, recommendations, lifecycle RPCs, dashboard/teacher/school analytics, model bindings, release activation and every importing deployed function. Counts must come from governed data, never a second `PHY7-U02` branch.

## Remaining review packet

[Forty draft misconception definitions and their response mappings](sprint-15b11-chapter-ii-misconception-review.md) are ready for explicit review. Approval of questions or publication of a guide does not approve these definitions. The packet flags terminology, broad response mappings and repeated concepts across skill scopes for attention.

The live release-gate evidence still contains historical draft counts from earlier insertions. Keep the gate decisions pending. The next authorized gate evaluation must refresh its inventory from live rows, preserve historical evidence and record the actual decision; stale counts must neither reopen completed question reviews nor imply that release gates passed.

## Bounded follow-on work

### 15B.12 — Authorized learning context and assessment policy

**Goal:** make runtime consumers operate on governed context and versioned policies without changing existing Chapter I outcomes.

**Acceptance:**

- Resolve authorized school/class, subject, grade, programme, unit and release server-side; reject unauthorized, mismatched, draft and inactive contexts.
- Bind selection, forms, readiness, scoring and displayed counts to the exact policy/blueprint. Preserve immutable historical session evidence and one-baseline scope.
- Preserve diagnostic-before-practice, stable resumes, retry/review lifecycle, protected-pool isolation and chapter-wide unseen coverage.
- Audit and update every affected API, UI, analytics consumer and deployed shared dependency; verify deployed bundle parity.
- Prove two-unit and two-subject isolation in isolated fixtures without activating draft production content; retain required CI, Chromium checks and aggregate Platform release checks.
- Leave live second-release switching acceptance open until there is a second authorized release. Isolated fixtures are not production acceptance.

**Exclusions:** curriculum activation, gate overrides, bulk question publication, learning-criterion changes or learner evidence resets.

### Content review and expansion

**Current follow-up — 2026-10-06:** [Chapter II assessment decision packet](chapter-ii-assessment-decision-packet.md) refreshes the inventory and records the deployed v1 scoring/readiness compatibility boundary after 15B.12E isolated acceptance. All 43 misconception definitions are now active and the eight template guides remain published. Counts, scoring/readiness and the expansion budget still await explicit approval. The earlier audit inventory below remains a historical checkpoint.

The product owner/SME resolves the assessment decisions and misconception packet. Then author the approved expansion in reviewable, outcome-specific batches, starting with new practice evidence for S02 and protecting diagnostic/mastery content from reuse. Every new family passes current-version QA, human review, mapping checks, guide applicability checks and the prospective evidence-purpose contract. Broader guide scope must be revalidated when families are added; published guides do not automatically cover arbitrary new content.

Finally create governed pools/forms/blueprints, reconcile outcomes and gate evidence, obtain the required SME/content/pilot/release dispositions, and perform authorized live multi-context acceptance. Sprint 14's remaining live-switching gate and the separate Grade 7 four-subject MVP gate stay open.
