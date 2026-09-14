# Sprint 8 — Content & Assessment Quality System

## Objective
Make question-bank development systematic, auditable and scalable rather than treating items as ad hoc rows.

## Core model
Every item now has explicit quality metadata and a lifecycle:

`draft/edit → version snapshot → technical QA → review → approved/published → retire/replace`

Technical QA is **not** the same as subject-matter review. An item can pass structural QA while still carrying warnings such as `content_review_not_approved` or `sme_review_pending`.

## Item metadata
`items` now stores:
- numeric difficulty `1–5`
- normalized `difficulty_band`: `foundation | core | challenge`
- `item_family`
- `source_reference`
- `validation_state`
- `review_status`
- `version_no`
- last-review audit fields
- retirement reason/date
- optional replacement item

Current difficulty mapping:
- 1 → foundation
- 2–3 → core
- 4–5 → challenge

## Misconception taxonomy
New tables:
- `misconceptions`
- `item_misconception_mappings`

The 10 Sprint-5 remediation misconception codes were normalized into the taxonomy. Existing 60 Chapter-I items were provisionally mapped to the general misconception for their skill. These are intentionally skill-level mappings; response-specific misconception mappings should be refined during content review.

## Technical answer-key QA
New table: `item_qa_runs`.

Checks include:
- prompt present
- difficulty valid and consistent with difficulty band
- answer key present
- single-choice answer exists among options
- minimum option count
- true/false answer is boolean
- numeric answer is numeric and has tolerance
- quantity answer has tolerance, canonical unit and accepted units
- metadata warnings for missing source, unspecified item family, pending content review, pending SME review, missing misconception mapping and exact duplicate prompts

Technical errors block approval. Warnings do not automatically fail technical QA.

## Review workflow
New table: `item_reviews`.

Review states:
- `unreviewed`
- `needs_review`
- `in_review`
- `changes_requested`
- `approved`

Review event types:
- content
- answer_key
- language
- accessibility
- SME

A changed published item is automatically removed from the learner pool and moved to `review` / `needs_review` until it is re-approved. Edits to options or answer keys also dirty the parent item automatically.

## Content versioning
New table: `item_versions`.

A version snapshot stores:
- item row
- options
- protected answer-key configuration
- misconception mappings
- change summary
- actor and timestamp

All 60 pre-Sprint-8 Chapter-I items received a baseline version-1 snapshot.

## Retirement / replacement
Items can be retired without deleting historical attempts.

Retirement records:
- timestamp
- reason
- optional replacement item

A replacement must:
- be a different item
- target the same skill
- be active/published
- have passing technical QA

Retirement changes lifecycle status to `archived`, so new diagnostics/practice/mastery checks will not select it. Historical attempts continue pointing to the retired item.

Restoring a retired item sends it back to review; it is not silently republished.

## Content Quality Console
Prototype route: `/content.html`

Allowed roles: `admin`, `content_admin`.

Features:
- bank-wide quality summary
- item search and filters
- skill filter
- review-state filter
- QA filter
- per-item metadata
- misconception codes
- QA errors/warnings
- version history summary
- run technical QA
- save metadata as a new version
- submit review
- approve
- request changes
- retire/replace
- restore to review

## Authorization
Content-quality tables are RLS-protected for `admin` and `content_admin` only. Students cannot read QA history, review history or version snapshots. Learner-facing item and option policies now exclude retired items.

Edge Functions:
- `get-content-quality-dashboard`
- `manage-content-quality`

Both require JWT verification and re-check the user's application role server-side.

## Baseline audit of the current Chapter-I bank
At Sprint-8 migration time:
- 60 items
- 60/60 passed deterministic structural answer-key QA
- 60/60 remain content-review unapproved
- 60/60 remain `provisional_no_sme_review`
- 24 items have `item_family = unspecified` and therefore need metadata refinement
- difficulty distribution: 17 foundation, 41 core, 2 challenge
- 10 normalized misconception codes
- 60 provisional item→misconception mappings
- 60 baseline version snapshots

This is an important distinction: the bank is technically coherent, but it is **not yet claimed to be SME-validated or production-approved**.

## Safety rules
1. Never hard-delete an item merely because it is poor; retire it so attempt history remains interpretable.
2. Never edit an answer key on a published item without forcing re-review.
3. Never equate technical-QA pass with pedagogical correctness or curriculum validation.
4. Never mark SME validation merely because a content admin approved workflow metadata.
5. Replacement items must preserve skill alignment and pass technical QA.

## Remaining live QA
The database migration, baseline audit and deterministic tests can be verified without a content-admin browser account. Final browser QA of `/content.html` requires a provisioned `content_admin` or `admin` account.
