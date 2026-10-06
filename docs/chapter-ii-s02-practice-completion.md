# Chapter II S02 — second practice/review expansion

**Sprint:** 15B.13, second bounded S02 batch (15B.13B). **Date:** 2026-10-06.
**Status:** Deployed and technically validated; human review pending.

**2026-10-06 correction:** This is the historical deployment checkpoint. Subsequent user review approved all four questions (I09 at revised v2). The [whole-bank comparison and I10 correction](chapter-ii-s02-whole-bank-review.md) supersedes the novelty claim below: I10 v1 repeated the I04/I07/I08 solution paths and needs a new reviewed version. I11 is intentional misconception practice. Passing structural QA and different evidence-purpose labels did not establish whole-bank distinctness. The separate guide remains draft.

John approved continuing the sprint map after the first S02 expansion's four questions and guide were reviewed. This slice adds **I09–I12**, completing the authored S02 practice/review target of twelve questions, subject to review of these four drafts. The chapter's Option B contract is unchanged: 96 practice/review, 32 diagnostic and 64 protected mastery questions, 192 total. The deployed chapter inventory is **40 authored: 36 approved and four drafts**, with **152 still to author**.

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

Two isolated PGlite tests execute the migration and actual content-QA handler with auth/query doubles: four technically valid drafts; twelve distractor mappings; balanced keys; valid media hashes; guide validation across all four variants; preservation of every pre-existing fixture row; complete rollback; duplicate rejection; seven predecessor/governance denials; no assessment-pool or blueprint changes. They are not authenticated production browser acceptance. The actual production transaction probe also executed the complete migration followed by rollback and preserved all **100 public-table checksums**. The deployed v11 content-QA source matches the repository exactly. PR CI #1243 and independent main CI #1244 passed all five required jobs: 1,224 Node tests, 35 native Chromium tests, both PostgreSQL jobs and aggregate Platform release checks.

## Deployment and review handoff

[PR #145](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/145) merged as `262aa8de89586b5fd81d1e5abe56efa1c66f9297`. Migration `sprint_15b13_s02_practice_completion` is applied at production version `20261006155942`; the recorded statement exactly matches the reviewed repository SQL (SHA-256 `863171ba623b16e37ac0bd6ac3f2a45a5943c58672132f98f591f0706e8582f7`). The local filename uses the CLI-generated version `20261006154828`; both identifiers are recorded for traceability.

Fresh production readback passes the deployed v11 content-QA evaluator for all four version-1 drafts, without errors or warnings. Four append-only technical QA records explicitly identify an automated system actor and the read-only production-snapshot evaluator method; this was not an authenticated live Edge invocation. The deployed-identical guide validator also passes all four variants without errors or warnings. No human approval was created.

After deployment and QA, exactly the expected additions occurred in 14 tables; every prior row and the other 86 complete tables are unchanged. Security/performance advisor findings are unchanged. Both reused image URLs returned HTTP 200 with the recorded hashes. Production deployment metadata and an independent HTTP 200 `release.json` read confirm implementation main `262aa8de89586b5fd81d1e5abe56efa1c66f9297`. No browser source or Edge bundle changed. [Deployment evidence](evidence/sprint-15b13-s02-completion-20261006.json).

Review the questions first, then the separate guide:

- [S02 I09](https://www.haiedu.am/content-item.html?id=d0586f20-fdea-40fe-8882-2cde615facb5)
- [S02 I10](https://www.haiedu.am/content-item.html?id=1a1c5d1b-aff5-441a-b7f1-3d63a4e9cadc)
- [S02 I11](https://www.haiedu.am/content-item.html?id=6934b7b9-21a9-4fa3-97c6-76bc83baa106)
- [S02 I12](https://www.haiedu.am/content-item.html?id=cab790d4-0920-4b58-8261-ebd6b215dc62)
- [Ինչպե՞ս ստուգել մասնիկային բացատրությունը](https://www.haiedu.am/content-guides.html?id=template%3A3e34388a-f088-4ac9-bdb2-20a2de495d4b)

Question approval and guide publication are separate human actions. The existing S02 questions/guides retain their approved/published versions. Chapter II stays draft, and the 192-question expansion remains open.
