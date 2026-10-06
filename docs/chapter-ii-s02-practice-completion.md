# Chapter II S02 — second practice/review expansion

**Sprint:** 15B.13, second bounded S02 batch (15B.13B). **Date:** 2026-10-06.
**Status:** Prepared and technically validated; deployment and human review pending.

John approved continuing the sprint map after the first S02 expansion's four questions and guide were reviewed. This slice adds **I09–I12**, completing the authored S02 practice/review target of twelve questions, subject to review of these four drafts. The chapter's Option B contract is unchanged: 96 practice/review, 32 diagnostic and 64 protected mastery questions, 192 total. After deployment, the chapter inventory will be **40 authored: 36 approved and four drafts**, with **152 still to author**.

## Evidence design and textbook grounding

| Item | Evidence purpose | New reasoning demand | Illustration |
|---|---|---|---|
| I09 | Core understanding | Explain why appearing continuous to the unaided eye does not refute particulate structure | Verbal task; no figure needed |
| I10 | Application | Apply one model to opposite changes: heated copper wire and compressed confined air | Textbook figure 23, printed page 25 |
| I11 | Misconception diagnosis | Reject the inference that weak liquid compression means no spaces between particles; consider dissolution/mixing evidence | Textbook figure 22, printed page 24 |
| I12 | Transfer reasoning | Distinguish compression with no gas escaping from gas leaving an open syringe, despite both reducing the occupied volume | Verbal comparison; no figure needed |

The source is the user's *Physics 7 (2023)* PDF, §7, printed pages 24–26, including question 11 on page 26. SHA-256: `d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904`. The reused figures retain original labels, omit explanatory captions and include Armenian alternative text; their crop provenance and hashes remain in [the media record](evidence/chapter-ii-s02-textbook-media-20261006.json). I12 is an authored transfer comparison using the same model, not a quoted textbook exercise. These practice stimuli do not authorize reuse in protected assessment banks.

The new `PHY7-U02-S02-F03-PARTICLE-MODEL-LIMITS` family and corresponding `T03` template preserve the prospective four-purpose evidence contract. Questions assess visibility, combined application, limits of an inference and comparison of system boundaries; they are not numerical reskins of I01–I08. Correct keys are B/D/A/C once each, with server-side shuffling enabled. All twelve distractors map to the three existing active S02 misconception definitions; no new definitions or approvals are created.

The separate draft guide **Ինչպե՞ս ստուգել մասնիկային բացատրությունը** prompts the learner to distinguish observation, inference and experimental conditions. Its worked example uses a clearly labelled eight-ball/six-ball model, not the live task. The guide and four questions require human review. Existing approved questions and both existing S02 guides, including John's published edits, are preserved.

## Boundaries and validation

This is a subject-aware content extension to the existing governed schema. It changes no shared runtime, dashboard, API, scoring rule, diagnostic prerequisite, schema, authorization or RLS policy. It creates no pool membership, blueprint, model/policy binding, pilot authorization or learner exposure. The Chapter II candidate remains draft. Prior-question illustration auditing and external SME, readiness/model, whole-chapter content, pilot and release gates remain open.

The migration fails closed if the eight predecessor questions lack current approval/passing QA, the preceding guide is not published, the approved misconceptions are unavailable, the candidate is no longer draft or the new family already exists. Every mutation is scoped to the new family/template.

Two isolated PGlite tests execute the migration and actual content-QA handler with auth/query doubles: four technically valid drafts; twelve distractor mappings; balanced keys; valid media hashes; guide validation across all four variants; preservation of every pre-existing fixture row; complete rollback; duplicate rejection; seven predecessor/governance denials; no assessment-pool or blueprint changes. They are not authenticated production browser acceptance. The actual production transaction probe also executed the complete migration followed by rollback and preserved all **100 public-table checksums**. The deployed v11 content-QA source matches the repository exactly. Required PR/main CI and deployed catalogue readback remain to be recorded before handoff.
